/**
 * Intelligent Photo Crop - Sistema inteligente de crop de fotos con detección facial
 * Maneja el crop de imágenes, detección facial automática, y mejora de calidad
 */

class IntelligentPhotoCrop {
    constructor() {
        this.modal = null;
        this.cropCanvas = null;
        this.previewCanvas = null;
        this.currentImage = null;
        this.faceDetection = null;
        this.cropArea = {
            x: 0,
            y: 0,
            width: 200,
            height: 200
        };
        this.imageTransform = {
            zoom: 1,
            rotation: 0,
            brightness: 1,
            contrast: 1,
            offsetX: 0,
            offsetY: 0
        };
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.activeHandle = null;
        this.faceDetectionAvailable = true;
        
        this.init();
    }

    // Helper function to safely show notifications
    showNotification(type, message) {
        if (typeof Utils !== 'undefined' && Utils.showNotification) {
            Utils.showNotification(type, message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Helper function to update slider value displays
    updateSliderValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    async init() {
        try {
            // Inicializar elementos del DOM primero
            this.initializeElements();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Intentar cargar modelos de face-api.js solo si está disponible
            if (typeof faceapi !== 'undefined') {
                try {
                    await this.loadFaceDetectionModels();
                    console.log('Intelligent Photo Crop initialized with face detection');
                } catch (error) {
                    console.warn('Face detection initialization failed, continuing without it:', error.message);
                    this.faceDetectionAvailable = false;
                }
            } else {
                console.log('face-api.js not available, crop will work without face detection');
                this.faceDetectionAvailable = false;
            }
            
            console.log('Intelligent Photo Crop initialized successfully');
        } catch (error) {
            console.error('Error initializing Intelligent Photo Crop:', error);
            // Continue with basic functionality even if face detection fails
            this.faceDetectionAvailable = false;
        }
    }

    async loadFaceDetectionModels() {
        try {
            // Verificar si face-api está disponible
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js not loaded');
            }
            
            // Usar un CDN alternativo más confiable
            const modelPath = '/models'; // Usar modelos locales si están disponibles
            
            // Cargar modelos necesarios para detección facial
            await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
            await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
            
            console.log('Face detection models loaded successfully');
        } catch (error) {
            console.warn('Face detection models could not be loaded:', error.message);
            this.faceDetectionAvailable = false;
            throw error;
        }
    }

    initializeElements() {
        this.modal = document.getElementById('photo-crop-modal');
        this.cropCanvas = document.getElementById('crop-canvas');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.fileInput = document.getElementById('photo-input');
        
        // Elementos de control simplificados
        this.zoomSlider = document.getElementById('zoom-slider');
        this.brightnessSlider = document.getElementById('brightness-slider');
        this.cropAreaElement = document.getElementById('crop-area');
        
        // Botones principales
        this.closeCropBtn = document.getElementById('close-crop-modal');
        this.autoCenterBtn = document.getElementById('auto-center-btn');
        this.savePhotoBtn = document.getElementById('save-photo-btn');
        
        // Los botones de cambiar/eliminar están en el modal de vista previa
        
        // Configurar contextos de canvas
        if (this.cropCanvas) {
            this.cropCtx = this.cropCanvas.getContext('2d');
        }
        if (this.previewCanvas) {
            this.previewCtx = this.previewCanvas.getContext('2d');
        }
    }

    setupEventListeners() {
        // File input
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Modal controls
        if (this.closeCropBtn) {
            this.closeCropBtn.addEventListener('click', () => this.closeCropModal());
        }
        
        if (this.autoCenterBtn) {
            this.autoCenterBtn.addEventListener('click', () => this.autoCenterFace());
        }
        
        if (this.savePhotoBtn) {
            this.savePhotoBtn.addEventListener('click', () => this.savePhoto());
        }

        // Los botones de cambiar/eliminar ahora están en el modal de vista previa

        // Sliders simplificados
        if (this.zoomSlider) {
            this.zoomSlider.addEventListener('input', (e) => {
                this.imageTransform.zoom = parseFloat(e.target.value);
                this.updateSliderValue('zoom-value', parseFloat(e.target.value).toFixed(1) + 'x');
                this.redrawCanvas();
            });
        }
        
        if (this.brightnessSlider) {
            this.brightnessSlider.addEventListener('input', (e) => {
                this.imageTransform.brightness = parseFloat(e.target.value);
                this.updateSliderValue('brightness-value', Math.round(e.target.value * 100) + '%');
                this.redrawCanvas();
            });
        }

        // Eventos de crop area
        this.setupCropAreaEvents();

        // Las acciones se muestran directamente desde contacts.js cuando es necesario
    }


    setupCropAreaEvents() {
        if (!this.cropAreaElement) return;

        // Mouse events para crop area
        this.cropAreaElement.addEventListener('mousedown', (e) => this.handleCropMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleCropMouseMove(e));
        document.addEventListener('mouseup', () => this.handleCropMouseUp());

        // Touch events para dispositivos móviles
        this.cropAreaElement.addEventListener('touchstart', (e) => this.handleCropTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleCropTouchMove(e), { passive: false });
        document.addEventListener('touchend', () => this.handleCropTouchEnd());

        // Eventos para handles de redimensionamiento
        const handles = this.cropAreaElement.querySelectorAll('.crop-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.handleResizeStart(e, handle));
            handle.addEventListener('touchstart', (e) => this.handleResizeTouchStart(e, handle), { passive: false });
        });
    }

    triggerFileInput() {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            this.showNotification('error', 'Por favor selecciona un archivo de imagen válido');
            return;
        }

        // Validar tamaño de archivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('error', 'La imagen es demasiado grande. Máximo 5MB');
            return;
        }

        try {
            // Cargar imagen
            await this.loadImage(file);
            
            // Abrir modal de crop
            this.openCropModal();
            
            // Detectar rostro automáticamente solo si está disponible
            if (this.faceDetectionAvailable && typeof faceapi !== 'undefined') {
                await this.detectFace();
            }
            // No mostrar estado de detección en la versión simple
            
        } catch (error) {
            console.error('Error processing image:', error);
            this.showNotification('error', 'Error al procesar la imagen');
        }
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    this.currentImage = img;
                    this.resetTransforms();
                    
                    // Configurar el canvas con dimensiones apropiadas
                    this.setupCanvasSize();
                    
                    // Inicializar el área de crop centrada
                    this.initializeCropArea();
                    
                    // Dibujar la imagen centrada y completa
                    this.redrawCanvas();
                    
                    resolve();
                };
                
                img.onerror = () => {
                    reject(new Error('Error loading image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    setupCanvasSize() {
        if (!this.cropCanvas || !this.currentImage) return;
        
        // Configurar el canvas para el contenedor más pequeño
        const container = this.cropCanvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Usar dimensiones más pequeñas y fijas
        this.cropCanvas.width = containerRect.width || 318; // 350 - padding
        this.cropCanvas.height = 200; // Altura fija
        
        // También configurar el canvas de preview más pequeño
        if (this.previewCanvas) {
            this.previewCanvas.width = 80;
            this.previewCanvas.height = 80;
        }
    }

    resetTransforms() {
        this.imageTransform = {
            zoom: 1,
            rotation: 0,
            brightness: 1,
            contrast: 1,
            offsetX: 0,
            offsetY: 0
        };

        // Resetear sliders simplificados
        if (this.zoomSlider) {
            this.zoomSlider.value = 1;
            this.updateSliderValue('zoom-value', '1.0x');
        }
        if (this.brightnessSlider) {
            this.brightnessSlider.value = 1;
            this.updateSliderValue('brightness-value', '100%');
        }
    }

    initializeCropArea() {
        if (!this.cropCanvas) return;
        
        // Usar las dimensiones del canvas, no del elemento DOM
        const canvasWidth = this.cropCanvas.width;
        const canvasHeight = this.cropCanvas.height;
        
        // Crear un área de crop cuadrada centrada
        const size = Math.min(canvasWidth, canvasHeight) * 0.7; // Usar 70% del tamaño mínimo
        
        this.cropArea = {
            x: (canvasWidth - size) / 2,
            y: (canvasHeight - size) / 2,
            width: size,
            height: size
        };

        this.updateCropAreaElement();
    }

    updateCropAreaElement() {
        if (!this.cropAreaElement) return;

        const container = this.cropAreaElement.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Convertir coordenadas del canvas a coordenadas del contenedor
        const scaleX = containerRect.width / this.cropCanvas.width;
        const scaleY = containerRect.height / this.cropCanvas.height;
        
        this.cropAreaElement.style.left = `${this.cropArea.x * scaleX}px`;
        this.cropAreaElement.style.top = `${this.cropArea.y * scaleY}px`;
        this.cropAreaElement.style.width = `${this.cropArea.width * scaleX}px`;
        this.cropAreaElement.style.height = `${this.cropArea.height * scaleY}px`;
    }

    async detectFace() {
        if (!this.currentImage) return;

        // Check if face detection is available
        if (!this.faceDetectionAvailable || typeof faceapi === 'undefined') {
            this.updateFaceDetectionStatus('Detección facial no disponible', 'error');
            return;
        }

        try {
            this.updateFaceDetectionStatus('Detectando rostro...', 'detecting');

            // Crear canvas temporal para la detección
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCanvas.width = this.currentImage.width;
            tempCanvas.height = this.currentImage.height;
            tempCtx.drawImage(this.currentImage, 0, 0);

            // Detectar rostros
            const detections = await faceapi
                .detectAllFaces(tempCanvas, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();

            if (detections && detections.length > 0) {
                // Usar el primer rostro detectado
                const face = detections[0];
                this.faceDetection = face;
                
                this.updateFaceDetectionStatus('✓ Rostro detectado', 'success');
                
                // Auto-centrar en el rostro
                this.centerCropOnFace(face);
                
            } else {
                this.updateFaceDetectionStatus('No se detectó ningún rostro', 'error');
                this.faceDetection = null;
            }

        } catch (error) {
            console.error('Error in face detection:', error);
            this.updateFaceDetectionStatus('Error en la detección', 'error');
            this.faceDetection = null;
        }
    }

    centerCropOnFace(faceDetection) {
        const detection = faceDetection.detection;
        const box = detection._box;
        
        // Calcular escala entre imagen original y canvas
        const scaleX = this.cropCanvas.width / this.currentImage.width;
        const scaleY = this.cropCanvas.height / this.currentImage.height;
        
        // Coordenadas del rostro en el canvas
        const faceX = box._x * scaleX;
        const faceY = box._y * scaleY;
        const faceWidth = box._width * scaleX;
        const faceHeight = box._height * scaleY;
        
        // Centrar el crop en el rostro con un poco de margen
        const margin = Math.max(faceWidth, faceHeight) * 0.3;
        const cropSize = Math.max(faceWidth, faceHeight) + margin * 2;
        
        this.cropArea = {
            x: Math.max(0, faceX + faceWidth / 2 - cropSize / 2),
            y: Math.max(0, faceY + faceHeight / 2 - cropSize / 2),
            width: Math.min(cropSize, this.cropCanvas.width),
            height: Math.min(cropSize, this.cropCanvas.height)
        };
        
        // Asegurar que el crop no se salga del canvas
        if (this.cropArea.x + this.cropArea.width > this.cropCanvas.width) {
            this.cropArea.x = this.cropCanvas.width - this.cropArea.width;
        }
        if (this.cropArea.y + this.cropArea.height > this.cropCanvas.height) {
            this.cropArea.y = this.cropCanvas.height - this.cropArea.height;
        }
        
        this.updateCropAreaElement();
        this.updatePreview();
    }

    autoCenterFace() {
        // Si hay detección facial disponible, usarla
        if (this.faceDetectionAvailable && typeof faceapi !== 'undefined' && this.faceDetection) {
            this.centerCropOnFace(this.faceDetection);
            return;
        }
        
        // Auto-centrado inteligente sin detección facial
        this.smartAutoCenter();
    }
    
    smartAutoCenter() {
        if (!this.currentImage) return;
        
        // Configuración inteligente para enfoque en rostros
        this.imageTransform.zoom = 1.5; // Zoom más fuerte para enfocar en rostro
        this.imageTransform.rotation = 0;
        this.imageTransform.offsetX = 0;
        this.imageTransform.offsetY = 0;
        
        // Mejorar brillo para mejor visibilidad del rostro
        this.imageTransform.brightness = 1.15; // Más brillo para rostros
        this.imageTransform.contrast = 1.1;  // Más contraste para definición
        
        // Actualizar sliders
        this.updateSliderValue('zoom-value', '1.5x');
        this.updateSliderValue('brightness-value', '115%');
        
        if (this.zoomSlider) this.zoomSlider.value = 1.5;
        if (this.brightnessSlider) this.brightnessSlider.value = 1.15;
        
        // Enfocar en la parte superior central (área típica de rostros)
        const centerX = this.cropCanvas.width / 2;
        const centerY = this.cropCanvas.height * 0.35; // Más arriba para rostros
        
        // Área de crop más grande para rostros
        const cropSize = Math.min(this.cropCanvas.width, this.cropCanvas.height) * 0.8;
        
        this.cropArea = {
            x: centerX - cropSize / 2,
            y: centerY - cropSize / 2,
            width: cropSize,
            height: cropSize
        };
        
        // Asegurar que el crop esté dentro del canvas
        this.cropArea.x = Math.max(0, Math.min(this.cropArea.x, this.cropCanvas.width - this.cropArea.width));
        this.cropArea.y = Math.max(0, Math.min(this.cropArea.y, this.cropCanvas.height - this.cropArea.height));
        
        // Actualizar UI
        this.updateCropAreaElement();
        this.redrawCanvas();
        
        // Mostrar notificación específica para rostros
        this.showNotification('success', '🎯 Auto-enfoque aplicado - Optimizado para rostros');
    }

    updateFaceDetectionStatus(message, status) {
        if (!this.faceDetectionStatus) return;
        
        // Actualizar el texto del mensaje
        const textElement = this.faceDetectionStatus.querySelector('span');
        if (textElement) {
            textElement.textContent = message;
        } else {
            this.faceDetectionStatus.textContent = message;
        }
        
        this.faceDetectionStatus.className = `face-detection-status ${status}`;
        
        // Actualizar icono según el estado
        const icon = this.faceDetectionStatus.querySelector('i');
        if (icon) {
            icon.className = status === 'detecting' ? 'fas fa-search fa-spin' :
                            status === 'success' ? 'fas fa-check' : 
                            status === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-times';
        }
    }

    redrawCanvas() {
        if (!this.currentImage || !this.cropCtx) return;

        // Limpiar canvas
        this.cropCtx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        
        // Configurar transformaciones
        this.cropCtx.save();
        
        // Aplicar filtros
        this.cropCtx.filter = `brightness(${this.imageTransform.brightness}) contrast(${this.imageTransform.contrast})`;
        
        // Calcular el área visible de la imagen considerando el zoom
        const zoom = this.imageTransform.zoom;
        const rotation = this.imageTransform.rotation * Math.PI / 180;
        
        // Centrar para rotación y zoom
        const centerX = this.cropCanvas.width / 2;
        const centerY = this.cropCanvas.height / 2;
        
        this.cropCtx.translate(centerX, centerY);
        this.cropCtx.rotate(rotation);
        this.cropCtx.scale(zoom, zoom);
        this.cropCtx.translate(-centerX, -centerY);
        
        // Aplicar offset para permitir mover la imagen
        this.cropCtx.translate(this.imageTransform.offsetX, this.imageTransform.offsetY);
        
        // Calcular dimensiones para mostrar la imagen completa inicialmente
        const canvasAspect = this.cropCanvas.width / this.cropCanvas.height;
        const imageAspect = this.currentImage.width / this.currentImage.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        // Ajustar para mostrar la imagen completa (fit)
        if (imageAspect > canvasAspect) {
            // Imagen más ancha: ajustar por ancho
            drawWidth = this.cropCanvas.width;
            drawHeight = drawWidth / imageAspect;
            drawX = 0;
            drawY = (this.cropCanvas.height - drawHeight) / 2;
        } else {
            // Imagen más alta: ajustar por alto
            drawHeight = this.cropCanvas.height;
            drawWidth = drawHeight * imageAspect;
            drawX = (this.cropCanvas.width - drawWidth) / 2;
            drawY = 0;
        }
        
        // Guardar las dimensiones calculadas para uso posterior
        this.imageDrawInfo = { drawX, drawY, drawWidth, drawHeight };
        
        // Dibujar imagen
        this.cropCtx.drawImage(this.currentImage, drawX, drawY, drawWidth, drawHeight);
        
        this.cropCtx.restore();
        
        // Actualizar preview
        this.updatePreview();
    }

    updatePreview() {
        if (!this.currentImage || !this.previewCtx || !this.imageDrawInfo) return;

        // Limpiar canvas de preview
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        // Configurar transformaciones igual que en el canvas principal
        this.previewCtx.save();
        this.previewCtx.filter = `brightness(${this.imageTransform.brightness}) contrast(${this.imageTransform.contrast})`;
        
        // Calcular las coordenadas en la imagen original
        const { drawX, drawY, drawWidth, drawHeight } = this.imageDrawInfo;
        
        // Calcular qué parte de la imagen original corresponde al área de crop
        const cropRelativeX = (this.cropArea.x - drawX) / drawWidth;
        const cropRelativeY = (this.cropArea.y - drawY) / drawHeight;
        const cropRelativeWidth = this.cropArea.width / drawWidth;
        const cropRelativeHeight = this.cropArea.height / drawHeight;
        
        // Asegurar que los valores estén dentro de los límites
        const clampedX = Math.max(0, Math.min(1, cropRelativeX));
        const clampedY = Math.max(0, Math.min(1, cropRelativeY));
        const clampedWidth = Math.max(0, Math.min(1 - clampedX, cropRelativeWidth));
        const clampedHeight = Math.max(0, Math.min(1 - clampedY, cropRelativeHeight));
        
        // Calcular coordenadas en la imagen original
        const sourceX = clampedX * this.currentImage.width;
        const sourceY = clampedY * this.currentImage.height;
        const sourceWidth = clampedWidth * this.currentImage.width;
        const sourceHeight = clampedHeight * this.currentImage.height;
        
        // Solo dibujar si hay área válida
        if (sourceWidth > 0 && sourceHeight > 0) {
            // Dibujar área croppada en el preview
            this.previewCtx.drawImage(
                this.currentImage,
                sourceX, sourceY, sourceWidth, sourceHeight,
                0, 0, this.previewCanvas.width, this.previewCanvas.height
            );
        }
        
        this.previewCtx.restore();
    }

    // Eventos de mouse para crop area
    handleCropMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;
        const rect = this.cropAreaElement.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleCropMouseMove(e) {
        if (!this.isDragging && !this.isResizing) return;
        
        e.preventDefault();
        
        if (this.isDragging) {
            this.moveCropArea(e.clientX, e.clientY);
        } else if (this.isResizing) {
            this.resizeCropArea(e.clientX, e.clientY);
        }
    }

    handleCropMouseUp() {
        this.isDragging = false;
        this.isResizing = false;
        this.activeHandle = null;
    }

    // Touch events
    handleCropTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleCropMouseDown(touch);
    }

    handleCropTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleCropMouseMove(touch);
    }

    handleCropTouchEnd() {
        this.handleCropMouseUp();
    }

    // Resize events
    handleResizeStart(e, handle) {
        e.stopPropagation();
        this.isResizing = true;
        this.activeHandle = handle.className.includes('top-left') ? 'top-left' :
                          handle.className.includes('top-right') ? 'top-right' :
                          handle.className.includes('bottom-left') ? 'bottom-left' : 'bottom-right';
        
        const rect = this.cropAreaElement.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleResizeTouchStart(e, handle) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        this.handleResizeStart(touch, handle);
    }

    moveCropArea(clientX, clientY) {
        const container = this.cropAreaElement.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        const newX = clientX - containerRect.left - this.dragStart.x;
        const newY = clientY - containerRect.top - this.dragStart.y;
        
        // Convertir a coordenadas del canvas
        const scaleX = this.cropCanvas.width / containerRect.width;
        const scaleY = this.cropCanvas.height / containerRect.height;
        
        this.cropArea.x = Math.max(0, Math.min(newX * scaleX, this.cropCanvas.width - this.cropArea.width));
        this.cropArea.y = Math.max(0, Math.min(newY * scaleY, this.cropCanvas.height - this.cropArea.height));
        
        this.updateCropAreaElement();
        this.updatePreview();
    }

    resizeCropArea(clientX, clientY) {
        // Implementar redimensionamiento manteniendo forma cuadrada
        const container = this.cropAreaElement.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        const scaleX = this.cropCanvas.width / containerRect.width;
        const scaleY = this.cropCanvas.height / containerRect.height;
        
        // Calcular nuevo tamaño basado en la distancia del mouse
        const mouseX = (clientX - containerRect.left) * scaleX;
        const mouseY = (clientY - containerRect.top) * scaleY;
        
        let newSize;
        
        if (this.activeHandle.includes('right')) {
            newSize = Math.max(50, mouseX - this.cropArea.x);
        } else {
            newSize = Math.max(50, this.cropArea.x + this.cropArea.width - mouseX);
            this.cropArea.x = Math.max(0, mouseX);
        }
        
        // Asegurar que el crop no se salga del canvas
        newSize = Math.min(newSize, this.cropCanvas.width - this.cropArea.x);
        newSize = Math.min(newSize, this.cropCanvas.height - this.cropArea.y);
        
        this.cropArea.width = newSize;
        this.cropArea.height = newSize;
        
        this.updateCropAreaElement();
        this.updatePreview();
    }

    async savePhoto() {
        if (!this.currentImage) {
            this.showNotification('error', 'No hay imagen para guardar');
            return;
        }

        try {
            // Crear canvas final con alta calidad
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            
            // Tamaño final de 400x400 para avatar
            finalCanvas.width = 400;
            finalCanvas.height = 400;
            
            // Aplicar transformaciones y crop
            finalCtx.imageSmoothingEnabled = true;
            finalCtx.imageSmoothingQuality = 'high';
            finalCtx.filter = `brightness(${this.imageTransform.brightness}) contrast(${this.imageTransform.contrast})`;
            
            // Calcular área de crop en la imagen original usando imageDrawInfo
            const { drawX, drawY, drawWidth, drawHeight } = this.imageDrawInfo;
            
            // Calcular qué parte de la imagen original corresponde al área de crop
            const cropRelativeX = (this.cropArea.x - drawX) / drawWidth;
            const cropRelativeY = (this.cropArea.y - drawY) / drawHeight;
            const cropRelativeWidth = this.cropArea.width / drawWidth;
            const cropRelativeHeight = this.cropArea.height / drawHeight;
            
            // Asegurar que los valores estén dentro de los límites
            const clampedX = Math.max(0, Math.min(1, cropRelativeX));
            const clampedY = Math.max(0, Math.min(1, cropRelativeY));
            const clampedWidth = Math.max(0, Math.min(1 - clampedX, cropRelativeWidth));
            const clampedHeight = Math.max(0, Math.min(1 - clampedY, cropRelativeHeight));
            
            // Calcular coordenadas finales en la imagen original
            const sourceX = clampedX * this.currentImage.width;
            const sourceY = clampedY * this.currentImage.height;
            const sourceWidth = clampedWidth * this.currentImage.width;
            const sourceHeight = clampedHeight * this.currentImage.height;
            
            // Dibujar imagen croppada en alta calidad
            finalCtx.drawImage(
                this.currentImage,
                sourceX, sourceY, sourceWidth, sourceHeight,
                0, 0, 400, 400
            );
            
            // Convertir a blob
            const blob = await new Promise(resolve => {
                finalCanvas.toBlob(resolve, 'image/jpeg', 0.95);
            });
            
            // Enviar al backend
            await this.uploadAvatar(blob);
            
            // Cerrar modal
            this.closeCropModal();
            
            this.showNotification('success', 'Foto de perfil actualizada exitosamente');
            
        } catch (error) {
            console.error('Error saving photo:', error);
            this.showNotification('error', 'Error al guardar la foto de perfil');
        }
    }

    async uploadAvatar(blob) {
        try {
            // Verificar si hay API disponible
            if (typeof API === 'undefined' || !API.Users) {
                throw new Error('Sistema de API no disponible');
            }
            
            // Verificar autenticación usando API client
            if (!API.Auth.isAuthenticated()) {
                throw new Error('Debes iniciar sesión para cambiar tu foto de perfil');
            }
            
            // Convertir blob a File para el API client
            const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            
            // Usar el API client para subir el avatar con progreso
            const response = await API.Users.uploadAvatar(file, (progress) => {
                console.log(`Upload progress: ${progress}%`);
            });
            
            // Verificar que la respuesta sea exitosa
            if (!response.success) {
                throw new Error(response.message || 'Error al procesar la imagen');
            }
            
            // Actualizar imagen de perfil en la UI
            this.updateProfileImageInUI(response.avatarUrl);
            
            // Actualizar usuario actual si está disponible
            if (window.AuthManager && window.AuthManager.getCurrentUser()) {
                window.AuthManager.updateCurrentUser({ avatar: response.avatarUrl });
            }
            
            return response;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    }

    updateProfileImageInUI(avatarUrl) {
        // Actualizar todas las imágenes de perfil del usuario actual
        const profileImages = document.querySelectorAll('.profile-img, #profile-modal-image');
        profileImages.forEach(img => {
            img.src = avatarUrl + '?t=' + Date.now(); // Cache busting
        });
    }

    async deletePhoto() {
        try {
            const confirmed = await this.showConfirmation(
                'Eliminar foto de perfil',
                '¿Estás seguro de que quieres eliminar tu foto de perfil?'
            );
            
            if (!confirmed) return;
            
            const response = await fetch('/api/users/avatar', {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Error deleting avatar');
            }
            
            // Actualizar UI con imagen por defecto
            this.updateProfileImageInUI('images/user-placeholder-40.svg');
            
            this.showNotification('success', 'Foto de perfil eliminada exitosamente');
            
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification('error', 'Error al eliminar la foto de perfil');
        }
    }

    showConfirmation(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation-modal');
            const titleEl = document.getElementById('confirmation-title');
            const messageEl = document.getElementById('confirmation-message');
            const confirmBtn = document.getElementById('confirmation-confirm');
            const cancelBtn = document.getElementById('confirmation-cancel');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            modal.classList.remove('hidden');
            
            const handleConfirm = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
        });
    }

    openCropModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            
            // Habilitar botón de auto-centrado siempre
            if (this.autoCenterBtn) {
                this.autoCenterBtn.disabled = false;
                this.autoCenterBtn.title = 'Auto-enfocar en rostro y mejorar brillo';
            }
            
            // Forzar redraw después de mostrar el modal
            setTimeout(() => {
                this.redrawCanvas();
            }, 100);
        }
    }

    showDeleteConfirmation() {
        const modal = document.getElementById('delete-photo-confirmation-modal');
        const cancelBtn = document.getElementById('cancel-delete-photo');
        const confirmBtn = document.getElementById('confirm-delete-photo');
        
        if (!modal) return;
        
        // Mostrar modal
        modal.classList.remove('hidden');
        
        // Manejar cancelación
        const handleCancel = () => {
            modal.classList.add('hidden');
            cancelBtn.removeEventListener('click', handleCancel);
            confirmBtn.removeEventListener('click', handleConfirm);
        };
        
        // Manejar confirmación
        const handleConfirm = () => {
            modal.classList.add('hidden');
            this.executeDeletePhoto();
            cancelBtn.removeEventListener('click', handleCancel);
            confirmBtn.removeEventListener('click', handleConfirm);
        };
        
        // Agregar event listeners
        cancelBtn.addEventListener('click', handleCancel);
        confirmBtn.addEventListener('click', handleConfirm);
        
        // Cerrar con overlay
        modal.querySelector('.modal-overlay').addEventListener('click', handleCancel, { once: true });
    }

    async executeDeletePhoto() {
        try {
            // Verificar autenticación usando API client
            if (typeof API === 'undefined' || !API.Auth.isAuthenticated()) {
                throw new Error('Debes iniciar sesión para eliminar tu foto de perfil');
            }
            
            // Usar el API client para eliminar el avatar
            const response = await API.Users.deleteAvatar();
            
            // Verificar que la respuesta sea exitosa
            if (!response.success) {
                throw new Error(response.message || 'Error al eliminar la foto');
            }
            
            // Cerrar modal si está abierto
            this.closeCropModal();
            
            // Actualizar usuario actual si está disponible
            if (window.AuthManager && window.AuthManager.getCurrentUser()) {
                window.AuthManager.updateCurrentUser({ avatar: null });
            }
            
            // Actualizar todas las imágenes de perfil
            this.updateProfileImageInUI('/images/default-avatar.png');
            
            // Mostrar notificación de éxito
            this.showNotification('success', 'Foto de perfil eliminada correctamente');
            
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification('error', 'Error al eliminar la foto de perfil');
        }
    }

    // Método público para compatibilidad
    async deletePhoto() {
        this.showDeleteConfirmation();
    }

    closeCropModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        
        // Limpiar estado
        this.currentImage = null;
        this.faceDetection = null;
        
        // Reset file input
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para que face-api.js se cargue completamente
    setTimeout(() => {
        window.intelligentPhotoCrop = new IntelligentPhotoCrop();
    }, 1000);
});