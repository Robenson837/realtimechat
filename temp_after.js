
    // Función para añadir video al campo de entrada
    addVideoToInput(videoBlob, videoUrl) {
        console.log('📹 Añadiendo video al input...');
        
        try {
            // Obtener el área de entrada de mensajes
            const messageInput = document.querySelector('#message-input') || 
                                document.querySelector('.message-input') || 
                                document.querySelector('input[type="text"]');
            
            if (!messageInput) {
                console.error('No se encontró el campo de entrada de mensajes');
                return;
            }
            
            // Crear preview del video en el input
            const inputContainer = messageInput.parentElement;
            
            // Crear contenedor de preview si no existe
            let previewContainer = inputContainer.querySelector('.video-preview-container');
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.className = 'video-preview-container';
                previewContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    background: #f0f0f0;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    margin-bottom: 8px;
                `;
                
                inputContainer.insertBefore(previewContainer, messageInput);
            }
            
            previewContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <video src="${videoUrl}" style="width: 60px; height: 45px; border-radius: 4px; object-fit: cover;"></video>
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: #666; font-weight: 500;">Video capturado</div>
                        <div style="font-size: 11px; color: #999;">Listo para enviar</div>
                    </div>
                    <button class="remove-video-btn" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                    " title="Eliminar video">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <button class="cancel-video-btn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    ">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="send-video-btn" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        flex: 1;
                    ">
                        <i class="fas fa-paper-plane"></i> Enviar video
                    </button>
                </div>
            `;
            
            // Guardar referencia del blob
            this.pendingVideoBlob = videoBlob;
            this.pendingVideoUrl = videoUrl;
            
            // Eventos de los botones
            const removeBtn = previewContainer.querySelector('.remove-video-btn');
            const cancelBtn = previewContainer.querySelector('.cancel-video-btn');
            const sendBtn = previewContainer.querySelector('.send-video-btn');
            
            removeBtn.onclick = cancelBtn.onclick = () => {
                if (this.pendingVideoUrl) {
                    URL.revokeObjectURL(this.pendingVideoUrl);
                }
                this.pendingVideoBlob = null;
                this.pendingVideoUrl = null;
                previewContainer.remove();
                console.log('📹 Video removido del input');
            };
            
            sendBtn.onclick = () => {
                if (this.pendingVideoBlob) {
                    const messageText = messageInput.value.trim();
                    this.sendVideoMessage(this.pendingVideoBlob, messageText);
                    
                    // Limpiar
                    messageInput.value = '';
                    if (this.pendingVideoUrl) {
                        URL.revokeObjectURL(this.pendingVideoUrl);
                    }
                    this.pendingVideoBlob = null;
                    this.pendingVideoUrl = null;
                    previewContainer.remove();
                }
            };
            
            // Focus en el input para que el usuario pueda escribir
            messageInput.focus();
            messageInput.placeholder = 'Escribe un comentario para el video (opcional)...';
            
            console.log('📹 Video añadido al input exitosamente');
            
        } catch (error) {
            console.error('Error añadiendo video al input:', error);
        }
    }
    
    // Función para enviar mensaje de video
    sendVideoMessage(videoBlob, messageText = '') {
        console.log('📹 Enviando mensaje de video...');
        
        try {
            // Buscar área de mensajes
            const messagesArea = document.querySelector('.messages') || 
                               document.querySelector('.chat-messages') || 
                               document.querySelector('#messages');
            
            if (messagesArea) {
                const videoUrl = URL.createObjectURL(videoBlob);
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message sent';
                messageDiv.style.cssText = 'margin: 10px; text-align: right;';
                
                const time = new Date().toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                messageDiv.innerHTML = `
                    <div style="background: #dcf8c6; padding: 8px 12px; border-radius: 18px; display: inline-block; max-width: 70%;">
                        <div style="margin: 4px 0;">
                            <video src="${videoUrl}" controls style="max-width: 300px; width: 100%; border-radius: 12px; cursor: pointer;"></video>
                        </div>
                        ${messageText ? `<div style="margin-top: 8px; color: #333; font-size: 14px;">${messageText}</div>` : ''}
                        <span style="font-size: 11px; color: #666; display: block; text-align: right; margin-top: 4px;">${time}</span>
                    </div>
                `;
                
                messagesArea.appendChild(messageDiv);
                messagesArea.scrollTop = messagesArea.scrollHeight;
                
                console.log('📹 Video enviado al chat exitosamente');
            } else {
                console.error('No se encontró el área de mensajes');
            }
            
        } catch (error) {
            console.error('Error enviando video:', error);
        }
    }

    // NUEVA FUNCIÓN PARA AÑADIR FOTO CAPTURADA AL CHAT
    addCapturedPhotoToChat(imageUrl, blob) {
        console.log('📷 Añadiendo foto capturada al chat...');
        
        try {
            // Crear un File object desde el blob
            const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });
            
            // Asignar como pendingImageFile y enviar
            this.pendingImageFile = file;
            
            // Limpiar input de mensaje
            if (this.messageInput) {
                this.messageInput.textContent = '';
            }
            
            console.log('📷 Enviando foto capturada...');
            
            // Enviar el mensaje usando el sistema existente
            this.sendCurrentMessage();
            
        } catch (error) {
            console.error('📷 Error añadiendo foto al chat:', error);
            
            // Fallback: Añadir imagen directamente al DOM si falla el envío normal
            this.addPhotoToMessagesDirectly(imageUrl);
        }
    }
    
    // FUNCIÓN FALLBACK PARA AÑADIR DIRECTAMENTE AL DOM
    addPhotoToMessagesDirectly(imageUrl) {
        console.log('📷 Fallback: Añadiendo foto directamente al DOM...');
        
        const messagesContainer = document.querySelector('.messages') || 
                                document.querySelector('.chat-messages') || 
                                document.querySelector('#messages') ||
                                document.querySelector('.messages-container');
        
        if (messagesContainer) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message sent';
            messageDiv.style.cssText = 'margin: 10px; text-align: right;';
            
            const time = new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            messageDiv.innerHTML = `
                <div class="message-content" style="background: #dcf8c6; padding: 8px 12px; border-radius: 18px; display: inline-block; max-width: 70%;">
                    <div class="message-image-container" style="margin: 4px 0;">
                        <img src="${imageUrl}" alt="Foto de cámara" style="max-width: 300px; width: 100%; border-radius: 12px; cursor: pointer;" 
                             onclick="this.style.position = this.style.position === 'fixed' ? 'static' : 'fixed'; 
                                      this.style.top = this.style.position === 'fixed' ? '0' : 'auto'; 
                                      this.style.left = this.style.position === 'fixed' ? '0' : 'auto'; 
                                      this.style.width = this.style.position === 'fixed' ? '100vw' : '100%'; 
                                      this.style.height = this.style.position === 'fixed' ? '100vh' : 'auto'; 
                                      this.style.zIndex = this.style.position === 'fixed' ? '999999' : 'auto'; 
                                      this.style.background = this.style.position === 'fixed' ? 'rgba(0,0,0,0.9)' : 'none'; 
                                      this.style.objectFit = this.style.position === 'fixed' ? 'contain' : 'none';">
                    </div>
                    <span class="message-time" style="font-size: 11px; color: #666;">${time}</span>
                </div>
            `;
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            console.log('📷 Foto añadida directamente al chat');
        } else {
            console.error('📷 No se encontró el contenedor de mensajes');
        }
    }

    async initializeCamera() {
        const overlay = document.getElementById('camera-modal-overlay');
        console.log('📷 Mostrando modal de cámara...');
        
        // Mostrar modal con animación suave
        overlay.style.display = 'flex';
        // Pequeño delay para permitir que el display flex tome efecto antes de agregar active
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
        
        try {
            // Configurar constraints de la cámara
            this.currentFacingMode = 'environment'; // Cámara trasera por defecto
            console.log('📷 Iniciando stream de cámara...');
            await this.startCameraStream();
            console.log('📷 Stream iniciado, configurando event listeners...');
            this.setupCameraEventListeners();
            console.log('📷 Event listeners configurados');
            
        } catch (error) {
            console.error('❌ Error en initializeCamera:', error);
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
            throw error;
        }
    }

    async startCameraStream() {
        const video = document.getElementById('camera-video');
        
        const constraints = {
            video: {
                facingMode: this.currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false // Para foto no necesitamos audio inicialmente
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        this.currentCameraStream = stream;
        
        // Esperar a que el video esté listo para captura
        return new Promise((resolve) => {
            video.addEventListener('loadedmetadata', () => {
                console.log('📹 Video metadata cargada, listo para captura');
                resolve();
            });
        });
    }

    cleanupCameraEventListeners() {
        // Limpiar todos los event listeners de la cámara
        this.cameraEventHandlers.handlers.forEach(({ element, event, handler }) => {
            if (element && handler) {
                element.removeEventListener(event, handler);
            }
        });
        
        // Reset handlers
        this.cameraEventHandlers = {
            setupComplete: false,
            handlers: []
        };
        
        console.log('🧹 Event listeners de cámara limpiados');
    }
    
    addCameraEventListener(element, event, handler) {
        if (element && handler) {
            element.addEventListener(event, handler);
            this.cameraEventHandlers.handlers.push({ element, event, handler });
        }
    }

    setupCameraEventListeners() {
        console.log('📷 Configurando event listeners de cámara...');
        
        // Evitar configuración múltiple
        if (this.cameraEventHandlers.setupComplete) {
            console.log('⚠️ Event listeners de cámara ya configurados, saltando...');
            return;
        }
        
        // Limpiar eventos anteriores por seguridad
        this.cleanupCameraEventListeners();
        
        const overlay = document.getElementById('camera-modal-overlay');
        const closeCameraBtn = document.getElementById('close-camera-btn');
        const fullscreenBtn = document.getElementById('fullscreen-camera-btn');
        const switchCameraBtnTop = document.getElementById('switch-camera-btn-top');
        const captureBtn = document.getElementById('camera-capture-btn');
        const savePhotoBtn = document.getElementById('save-photo-btn');
        const retakePhotoBtn = document.getElementById('retake-photo-btn');
        const galleryAccessBtn = document.getElementById('gallery-access-btn');

        console.log('Elementos de cámara encontrados:', {
            overlay: !!overlay,
            closeCameraBtn: !!closeCameraBtn,
            captureBtn: !!captureBtn,
            savePhotoBtn: !!savePhotoBtn,
            retakePhotoBtn: !!retakePhotoBtn
        });
        
        // Variables para manejo de presión prolongada estilo WhatsApp
        let pressTimer = null;
        let isRecording = false;
        let recordingStartTime = null;
        let recordingTimer = null;
        
        // Cerrar modal
        if (closeCameraBtn) {
            this.addCameraEventListener(closeCameraBtn, 'click', () => this.closeCameraModal());
        }
        
        // Pantalla completa
        if (fullscreenBtn) {
            this.addCameraEventListener(fullscreenBtn, 'click', () => this.toggleFullscreen());
        }
        
        // Cambiar cámara (frontal/trasera)
        if (switchCameraBtnTop) {
            this.addCameraEventListener(switchCameraBtnTop, 'click', () => this.switchCamera());
        }
        
        // Acceso a galería
        if (galleryAccessBtn) {
            this.addCameraEventListener(galleryAccessBtn, 'click', () => {
                this.closeCameraModal();
                this.openGallery();
            });
        }
        
        // WhatsApp-style capture button behavior
        const startPressTimer = () => {
            // Inmediatamente cambiar estilo del botón
            captureBtn.classList.add('pressing');
            
            pressTimer = setTimeout(async () => {
                // Iniciar grabación de video después de 600ms (como WhatsApp)
                await this.startVideoRecording();
                isRecording = true;
                this.startRecordingTimer();
            }, 600);
        };
        
        const cancelPressTimer = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            captureBtn.classList.remove('pressing');
        };
        
        const handleRelease = async () => {
            cancelPressTimer();
            
            if (isRecording) {
                // Detener grabación de video
                await this.stopVideoRecording();
                this.stopRecordingTimer();
                isRecording = false;
            } else {
                // Tomar foto (tap rápido)
                await this.capturePhoto();
            }
        };
        
        // Mouse events para botón de captura
        if (captureBtn) {
            this.addCameraEventListener(captureBtn, 'mousedown', startPressTimer);
            this.addCameraEventListener(captureBtn, 'mouseup', handleRelease);
            this.addCameraEventListener(captureBtn, 'mouseleave', () => {
                cancelPressTimer();
                if (isRecording) {
                    this.stopVideoRecording();
                    this.stopRecordingTimer();
                    isRecording = false;
                }
            });
            
            // Touch events para móviles (más importante para WhatsApp-style)
            // Nota: Estos requieren opciones especiales, pero addCameraEventListener no las maneja
            // Los mantenemos como están pero los guardamos para cleanup
            const touchStartHandler = (e) => {
                e.preventDefault();
                startPressTimer();
            };
            const touchEndHandler = (e) => {
                e.preventDefault();
                handleRelease();
            };
            const touchCancelHandler = () => {
                cancelPressTimer();
                if (isRecording) {
                    this.stopVideoRecording();
                    this.stopRecordingTimer();
                    isRecording = false;
                }
            };
            
            captureBtn.addEventListener('touchstart', touchStartHandler, { passive: false });
            captureBtn.addEventListener('touchend', touchEndHandler, { passive: false });
            captureBtn.addEventListener('touchcancel', touchCancelHandler);
            
            // Guardar para cleanup (eventos especiales)
            this.cameraEventHandlers.handlers.push(
                { element: captureBtn, event: 'touchstart', handler: touchStartHandler },
                { element: captureBtn, event: 'touchend', handler: touchEndHandler },
                { element: captureBtn, event: 'touchcancel', handler: touchCancelHandler }
            );
        }
        
        // Botones de acción después de captura (WhatsApp style)
        if (savePhotoBtn) {
            console.log('Configurando evento para savePhotoBtn');
            this.addCameraEventListener(savePhotoBtn, 'click', () => {
                console.log('Botón enviar clickeado!');
                this.saveCapture();
            });
        } else {
            console.error('savePhotoBtn no encontrado!');
        }
        
        if (retakePhotoBtn) {
            console.log('Configurando evento para retakePhotoBtn');
            this.addCameraEventListener(retakePhotoBtn, 'click', () => this.retakeCapture());
        } else {
            console.error('retakePhotoBtn no encontrado!');
        }
        
        // Cerrar al hacer clic en overlay (pero no en el video)
        if (overlay) {
            this.addCameraEventListener(overlay, 'click', (e) => {
                if (e.target === overlay) {
                    this.closeCameraModal();
                }
            });
        }
        
        // Cerrar con la tecla Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
                this.closeCameraModal();
            }
        };
        this.addCameraEventListener(document, 'keydown', handleEscape);
        
        // Marcar configuración como completa
        this.cameraEventHandlers.setupComplete = true;
        console.log('✅ Event listeners de cámara configurados correctamente');
    }

    startRecordingTimer() {
        this.recordingStartTime = Date.now();
        const recordingTimeElement = document.getElementById('recording-time');
        
        this.recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            recordingTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        const recordingTimeElement = document.getElementById('recording-time');
        if (recordingTimeElement) {
            recordingTimeElement.textContent = '0:00';
        }
    }

    async switchCamera() {
        if (this.currentCameraStream) {
            this.currentCameraStream.getTracks().forEach(track => track.stop());
        }
        
        // Cambiar entre frontal y trasera
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        
        try {
            await this.startCameraStream();
        } catch (error) {
            console.error('Error switching camera:', error);
            Utils.Notifications.error('No se pudo cambiar la cámara');
        }
    }

    async startVideoRecording() {
        const video = document.getElementById('camera-video');
        const captureBtn = document.getElementById('camera-capture-btn');
        const recordingIndicator = document.getElementById('recording-indicator');
        
        try {
            // Configurar stream con audio para video (WhatsApp style)
            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Reemplazar stream del video
            video.srcObject = stream;
            this.currentCameraStream = stream;
            
            // Configurar MediaRecorder
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.handleVideoRecorded();
            };
            
            // Iniciar grabación
            this.mediaRecorder.start();
            
            // Mostrar indicadores de grabación WhatsApp-style
            captureBtn.classList.add('recording');
            recordingIndicator.style.display = 'flex';
            
        } catch (error) {
            console.error('Error starting video recording:', error);
            Utils.Notifications.error('No se pudo iniciar la grabación de video');
        }
    }

    async stopVideoRecording() {
        const captureBtn = document.getElementById('camera-capture-btn');
        const recordingIndicator = document.getElementById('recording-indicator');
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Ocultar indicadores de grabación
        captureBtn.classList.remove('recording');
        recordingIndicator.style.display = 'none';
    }

    handleVideoRecorded() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        
        // Para el preview del modal de cámara, usar blob URL temporalmente
        // La conversión a data URL se hará solo cuando sea necesario para el chat
        this.capturedVideoBlob = blob;
        this.capturedVideoUrl = videoUrl;
        this.captureType = 'video';
        
        console.log('Video guardado');
        
        // Mostrar preview del video
        this.showCapturePreview(videoUrl, 'video');
    }

    async capturePhoto() {
        console.log('Iniciando captura de foto...');
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');
        
        if (!video || !canvas) {
            console.error('Elementos de video o canvas no encontrados');
            return;
        }
        
        console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        
        // Verificar que el video tenga dimensiones válidas
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.error('Video no está listo para captura');
            Utils.Notifications.error('Error: Video no está listo');
            return;
        }
        
        // Configurar canvas con las dimensiones del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Capturar frame actual del video
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        console.log('Frame capturado en canvas');
        
        // Convertir canvas a data URL (compatible con CSP)
        try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            console.log('Data URL creado');
            
            // Convertir data URL a blob sin usar fetch (evita CSP)
            const blob = this.dataURLToBlob(dataURL);
            console.log('Blob creado:', blob.size, 'bytes');
            
            // Guardar referencia de la imagen
            this.capturedImageBlob = blob;
            this.capturedImageUrl = dataURL; // Usar data URL para mostrar
            this.captureType = 'image';
            
            console.log('Datos guardados:', {
                blobSize: blob.size,
                captureType: this.captureType,
                hasBlob: !!this.capturedImageBlob
            });
            
            console.log('Mostrando preview...');
            // Mostrar preview
            this.showCapturePreview(dataURL, 'image');
                
        } catch (error) {
            console.error('Error al capturar foto:', error);
            Utils.Notifications.error('Error al capturar foto');
        }
    }

    // Función helper para convertir data URL a blob sin usar fetch
    dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    // Función helper para convertir blob a data URL
    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Función para crear thumbnail de video
    createVideoThumbnail(videoUrl) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            video.onloadedmetadata = () => {
                try {
                    // Configurar canvas con las dimensiones del video
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Ir al primer frame
                    video.currentTime = 0.1; // Pequeño offset para evitar frame negro
                    
                    video.onseeked = () => {
                        try {
                            // Capturar frame en canvas
                            ctx.drawImage(video, 0, 0);
                            
                            // Convertir a data URL
                            const thumbnailDataURL = canvas.toDataURL('image/jpeg', 0.8);
                            resolve(thumbnailDataURL);
                        } catch (error) {
                            reject(error);
                        }
                    };
                } catch (error) {
                    reject(error);
                }
            };
            
            video.onerror = reject;
            video.src = videoUrl;
            video.load();
        });
    }

    showCapturePreview(url, type) {
        console.log('Mostrando preview para:', type);
        
        const capturePreview = document.getElementById('capture-preview');
        const capturedImage = document.getElementById('captured-image');
        const capturedVideo = document.getElementById('captured-video');
        const cameraVideo = document.getElementById('camera-video');
        
        if (!capturePreview || !capturedImage || !capturedVideo || !cameraVideo) {
            console.error('Elementos de preview no encontrados');
            Utils.Notifications.error('Error en el preview');
            return;
        }
        
        if (type === 'image') {
            console.log('Configurando imagen para preview...');
            // Mostrar imagen y ocultar video
            capturedImage.src = url;
            capturedImage.style.display = 'block';
            capturedVideo.style.display = 'none';
            
            // Verificar que la imagen se cargó correctamente
            capturedImage.onload = () => {
                console.log('Imagen cargada correctamente');
            };
            
            capturedImage.onerror = () => {
                console.error('Error al cargar imagen en preview');
                Utils.Notifications.error('Error al mostrar preview');
            };
            
        } else if (type === 'video') {
            console.log('Configurando video para preview...');
            // Para videos, crear un thumbnail del primer frame
            this.createVideoThumbnail(url).then(thumbnailDataURL => {
                // Mostrar el thumbnail como imagen
                capturedImage.src = thumbnailDataURL;
                capturedImage.style.display = 'block';
                capturedVideo.style.display = 'none';
                
                console.log('Thumbnail de video creado correctamente');
            }).catch(error => {
                console.error('Error al crear thumbnail del video:', error);
                // Fallback: mostrar un ícono de video
                capturedImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNNzUgNDBMMTI1IDcwTDc1IDEwMFY0MFoiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
                capturedImage.style.display = 'block';
                capturedVideo.style.display = 'none';
            });
        }
        
        // Ocultar video y mostrar preview con animación suave
        console.log('Cambiando a modo preview...');
        console.log('Estados antes del cambio:', {
            cameraVideoDisplay: cameraVideo.style.display,
            capturePreviewDisplay: capturePreview.style.display
        });
        
        cameraVideo.style.display = 'none';
        capturePreview.style.display = 'flex';
        
        console.log('Estados después del cambio:', {
            cameraVideoDisplay: cameraVideo.style.display,
            capturePreviewDisplay: capturePreview.style.display
        });
        
        // Verificar que los botones estén visibles
        const previewControls = document.querySelector('.whatsapp-preview-controls');
        const saveBtn = document.getElementById('save-photo-btn');
        const retakeBtn = document.getElementById('retake-photo-btn');
        
        console.log('Botones del preview:', {
            previewControls: !!previewControls,
            previewControlsDisplay: previewControls ? previewControls.style.display : 'not found',
            saveBtn: !!saveBtn,
            retakeBtn: !!retakeBtn
        });
        
        // Pequeño delay para asegurar que se muestre correctamente
        setTimeout(() => {
            console.log('Preview mostrado');
        }, 100);
    }

    saveCapture() {
        console.log('saveCapture llamado:', {
            captureType: this.captureType,
            hasImageBlob: !!this.capturedImageBlob,
            hasVideoBlob: !!this.capturedVideoBlob
        });

        if (this.captureType === 'image' && this.capturedImageBlob) {
            console.log('Procesando imagen capturada...');
            const file = new File([this.capturedImageBlob], 'camera-photo.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
            });
            console.log('Archivo de imagen creado:', file);
            
            // Llamar a handleImageUpload
            this.handleImageUpload(file);
            console.log('handleImageUpload llamado');
            
        } else if (this.captureType === 'video' && this.capturedVideoBlob) {
            console.log('Procesando video capturado...');
            const file = new File([this.capturedVideoBlob], 'camera-video.webm', {
                type: 'video/webm',
                lastModified: Date.now()
            });
            console.log('Enviando video capturado...');
            this.handleVideoUpload(file);
        } else {
            console.error('No hay captura para enviar:', {
                captureType: this.captureType,
                hasImageBlob: !!this.capturedImageBlob,
                hasVideoBlob: !!this.capturedVideoBlob
            });
            Utils.Notifications.error('No hay captura para enviar');
            return;
        }
        
        console.log('Cerrando modal de cámara...');
        this.closeCameraModal();
    }

    retakeCapture() {
        console.log('Retomando captura...');
        const capturePreview = document.getElementById('capture-preview');
        const capturedImage = document.getElementById('captured-image');
        const capturedVideo = document.getElementById('captured-video');
        const cameraVideo = document.getElementById('camera-video');
        
        if (!capturePreview || !cameraVideo) {
            console.error('Elementos de retake no encontrados');
            return;
        }
        
        // Ocultar preview y mostrar video nuevamente
        capturePreview.style.display = 'none';
        cameraVideo.style.display = 'block';
        
        // Limpiar elementos de preview
        if (capturedImage) {
            capturedImage.src = '';
            capturedImage.style.display = 'none';
        }
        if (capturedVideo) {
            capturedVideo.src = '';
            capturedVideo.style.display = 'none';
        }
        
        // Limpiar datos capturados
        this.cleanupCapturedData();
        
        console.log('Volviendo a modo cámara');
    }

    cleanupCapturedData() {
        if (this.capturedImageUrl) {
            URL.revokeObjectURL(this.capturedImageUrl);
        }
        if (this.capturedVideoUrl) {
            URL.revokeObjectURL(this.capturedVideoUrl);
        }
        
        this.capturedImageBlob = null;
        this.capturedImageUrl = null;
        this.capturedVideoBlob = null;
        this.capturedVideoUrl = null;
        this.captureType = null;
    }

    closeCameraModal() {
        console.log('🔄 Cerrando modal de cámara...');
        
        const overlay = document.getElementById('camera-modal-overlay');
        const capturePreview = document.getElementById('capture-preview');
        
        // Limpiar event listeners de cámara
        this.cleanupCameraEventListeners();
        
        // Parar stream
        if (this.currentCameraStream) {
            this.currentCameraStream.getTracks().forEach(track => track.stop());
            this.currentCameraStream = null;
        }
        
        // Parar grabación si está activa
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Limpiar datos
        this.cleanupCapturedData();
        
        // Reset UI
        capturePreview.style.display = 'none';
        document.getElementById('camera-video').style.display = 'block';
        document.getElementById('camera-capture-btn').classList.remove('recording');
        document.getElementById('recording-indicator').style.display = 'none';
        
        // Limpiar timer de grabación
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        // Cerrar modal con animación suave
        overlay.classList.remove('active');
        // Esperar a que termine la animación antes de ocultar completamente
        setTimeout(() => {
            if (!overlay.classList.contains('active')) {
                overlay.style.display = 'none';
            }
        }, 300); // Coincide con la duración de la transición CSS
    }

    toggleFullscreen() {
        const overlay = document.getElementById('camera-modal-overlay');
        const fullscreenBtn = document.getElementById('fullscreen-camera-btn');
        const icon = fullscreenBtn.querySelector('i');
        
        if (overlay.classList.contains('fullscreen')) {
            // Salir de pantalla completa
            overlay.classList.remove('fullscreen');
            icon.className = 'fas fa-expand';
            fullscreenBtn.title = 'Pantalla completa';
        } else {
            // Entrar en pantalla completa
            overlay.classList.add('fullscreen');
            icon.className = 'fas fa-compress';
            fullscreenBtn.title = 'Salir de pantalla completa';
        }
    }

    shareLocation() {
        if (navigator.geolocation) {
            Utils.Notifications.info('Obteniendo ubicación...');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const locationText = `Mi ubicación: https://maps.google.com/?q=${latitude},${longitude}`;
                    this.sendMessage(locationText);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    Utils.Notifications.error('No se pudo obtener la ubicación');
                }
            );
        } else {
            Utils.Notifications.error('Tu navegador no soporta geolocalización');
        }
    }

    toggleEmojiPicker() {
        // Usar el selector de emojis avanzado
        const messageInput = Utils.$('#message-input') || Utils.$('.message-input');
        if (messageInput && window.emojiPicker) {
            window.emojiPicker.toggle(messageInput);
        } else {
            console.error('EmojiPicker no está disponible o no se encontró el input de mensaje');
            Utils.Notifications.error('Error al abrir el selector de emojis');
        }
    }

    handleFileUpload(file, type) {
        if (type === 'camera' || type === 'image') {
            this.handleImageUpload(file);
        } else {
            Utils.Notifications.info(`Subiendo ${type}: ${file.name}`);
            console.log(`Uploading ${type}:`, file);
        }
    }

    handleImageUpload(file) {
        console.log('handleImageUpload llamado con:', file);
        
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            console.error('Archivo no es imagen:', file.type);
            Utils.Notifications.error('Por favor selecciona un archivo de imagen válido');
            return;
        }

        console.log('Archivo es válido, creando preview...');

        // Convertir a data URL para evitar problemas de CSP
        this.blobToDataURL(file).then(dataURL => {
            console.log('Data URL creada para imagen');
            
            // Mostrar preview de la imagen en el área de input
            this.showImagePreview(dataURL, file);
            console.log('Preview mostrado en área de input');
            
            Utils.Notifications.success('Imagen cargada. Escribe un mensaje opcional y envía.');
        }).catch(error => {
            console.error('Error al crear data URL para imagen:', error);
            Utils.Notifications.error('Error al procesar imagen');
        });
    }

    handleVideoUpload(file) {
        // Validar que sea un video
        if (!file.type.startsWith('video/')) {
            Utils.Notifications.error('Por favor selecciona un archivo de video válido');
            return;
        }

        // Para el preview en chat, convertir a data URL para evitar CSP
        this.blobToDataURL(file).then(dataURL => {
            // Mostrar preview del video en el área de input con data URL
            this.showVideoPreview(dataURL, file);
            Utils.Notifications.success('Video cargado. Escribe un mensaje opcional y envía.');
        }).catch(error => {
            console.error('Error al procesar video:', error);
            Utils.Notifications.error('Error al procesar video');
        });
    }

    showImagePreview(imageUrl, file) {
        const messageInputContainer = Utils.$('#message-input-container');
        if (!messageInputContainer) return;

        // Remover preview existente si lo hay
        this.removeImagePreview();

        // Crear el contenedor de preview
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';
        previewContainer.innerHTML = `
            <div class="image-preview-wrapper">
                <img src="${imageUrl}" alt="Vista previa" class="image-preview">
                <button class="remove-image-btn" title="Eliminar imagen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="image-info">
                <i class="fas fa-camera"></i>
                <span class="image-name">${file.name}</span>
                <span class="image-size">(${this.formatFileSize(file.size)})</span>
            </div>
        `;

        // Insertar el preview antes del área de input
        messageInputContainer.insertBefore(previewContainer, messageInputContainer.firstChild);

        // Agregar event listener para eliminar la imagen
        const removeBtn = previewContainer.querySelector('.remove-image-btn');
        removeBtn.addEventListener('click', () => {
            this.removeImagePreview();
        });

        // Guardar referencia del archivo para envío
        this.pendingImageFile = file;
        this.pendingImageUrl = imageUrl;

        // Enfocar el input de texto
        const messageInput = Utils.$('#message-input');
        if (messageInput) {
            messageInput.focus();
        }
        
        // Actualizar el botón de envío para activarlo con la imagen
        this.updateSendButton();
    }

    showVideoPreview(videoUrl, file) {
        const messageInputContainer = Utils.$('#message-input-container');
        if (!messageInputContainer) return;

        // Remover preview existente si lo hay
        this.removeVideoPreview();

        // Crear el contenedor de preview
        const previewContainer = document.createElement('div');
        previewContainer.className = 'video-preview-container';
        previewContainer.innerHTML = `
            <div class="video-preview-wrapper">
                <video src="${videoUrl}" controls class="video-preview" style="max-width: 300px; max-height: 200px;">
                    Tu navegador no soporta el elemento video.
                </video>
                <button class="remove-video-btn" title="Eliminar video">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="video-info">
                <i class="fas fa-video"></i>
                <span class="video-name">${file.name}</span>
                <span class="video-size">(${this.formatFileSize(file.size)})</span>
            </div>
        `;

        // Insertar el preview antes del área de input
        messageInputContainer.insertBefore(previewContainer, messageInputContainer.firstChild);

        // Agregar event listener para eliminar el video
        const removeBtn = previewContainer.querySelector('.remove-video-btn');
        removeBtn.addEventListener('click', () => {
            this.removeVideoPreview();
        });

        // Guardar referencia del archivo para envío
        this.pendingVideoFile = file;
        this.pendingVideoUrl = videoUrl;

        // Enfocar el input de texto
        const messageInput = Utils.$('#message-input');
        if (messageInput) {
            messageInput.focus();
        }
    }

    removeImagePreview() {
        const previewContainer = document.querySelector('.image-preview-container');
        if (previewContainer) {
            previewContainer.remove();
        }

        // Limpiar referencias
        if (this.pendingImageUrl) {
            URL.revokeObjectURL(this.pendingImageUrl);
        }
        this.pendingImageFile = null;
        this.pendingImageUrl = null;
        
        // Actualizar el botón de envío
        this.updateSendButton();
    }

    removeVideoPreview() {
        const previewContainer = document.querySelector('.video-preview-container');
        if (previewContainer) {
            previewContainer.remove();
        }

        // Limpiar referencias
        if (this.pendingVideoUrl) {
            URL.revokeObjectURL(this.pendingVideoUrl);
        }
        this.pendingVideoFile = null;
        this.pendingVideoUrl = null;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async uploadFile(file, type = 'image') {
        console.log('Uploading file:', file.name, type);
        
        const formData = new FormData();
        const fieldName = type === 'image' ? 'image' : 'file';
        formData.append(fieldName, file);
        
        try {
            const response = await fetch(`/api/upload/${type}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Upload failed');
            }
            
            console.log('File uploaded successfully:', result.data);
            return result.data;
            
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    }

    updateTemporaryMessageImage(tempId, uploadResult) {
        const messageEl = document.querySelector(`[data-client-id="${tempId}"]`);
        if (messageEl) {
            const imageEl = messageEl.querySelector('.message-image img');
            if (imageEl) {
                // Update the image source to use the server URL
                imageEl.src = uploadResult.url;
                console.log('Updated temporary message image with server URL:', uploadResult.url);
            }
        }
    }

    expandImage(imgElement) {
        // Crear overlay para imagen expandida
        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: zoom-out;
        `;

        // Crear imagen expandida
        const expandedImg = document.createElement('img');
        expandedImg.src = imgElement.src;
        expandedImg.alt = imgElement.alt;
        expandedImg.style.cssText = `
            max-width: 90vw;
            max-height: 90vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        // Crear botón de cerrar
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Cerrar (ESC)';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 30px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 40px;
            cursor: pointer;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            transition: background 0.2s ease;
        `;

        // Crear botón de descarga
        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.title = 'Descargar imagen';
        downloadBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 90px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            transition: background 0.2s ease;
        `;

        // Event listeners para hover
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        downloadBtn.addEventListener('mouseenter', () => {
            downloadBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        });

        downloadBtn.addEventListener('mouseleave', () => {
            downloadBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        // Función para cerrar
        const closeOverlay = () => {
            overlay.remove();
            document.body.style.overflow = '';
        };

        // Función para descargar imagen
        const downloadImage = async () => {
            try {
                const response = await fetch(imgElement.src);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                
                // Generar nombre de archivo basado en la fecha/hora
                const now = new Date();
                const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
                const extension = imgElement.src.split('.').pop().split('?')[0] || 'jpg';
                link.download = `imagen-${timestamp}.${extension}`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('Imagen descargada exitosamente');
            } catch (error) {
                console.error('Error al descargar imagen:', error);
                // Fallback: intentar descarga directa
                const link = document.createElement('a');
                link.href = imgElement.src;
                link.download = `imagen-${Date.now()}.jpg`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };

        // Event listeners
        closeBtn.addEventListener('click', closeOverlay);
        downloadBtn.addEventListener('click', downloadImage);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeOverlay();
            }
        });

        // Cerrar con ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeOverlay();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Agregar elementos
        overlay.appendChild(expandedImg);
        overlay.appendChild(closeBtn);
        overlay.appendChild(downloadBtn);
        document.body.appendChild(overlay);
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';

        // Animación de entrada
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
    }

    setupMobileInputBehavior() {
        const messageInput = Utils.$('#message-input');
        const messageInputContainer = Utils.$('#message-input-container');
        
        if (!messageInput || !messageInputContainer) return;
        
        // Set up viewport height handling for mobile keyboard
        this.setupMobileViewportHandler();

        // Handle focus/blur for hiding navigation
        messageInput.addEventListener('focus', () => {
            if (window.innerWidth <= 768) {
                messageInputContainer.classList.add('typing-mode');
                // Hide bottom navigation on mobile
                const sidebar = Utils.$('.sidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    // Don't hide navigation if sidebar is open
                    return;
                }
                // Add class to hide navigation tabs
                document.body.classList.add('mobile-typing');
            }
        });

        messageInput.addEventListener('blur', () => {
            if (window.innerWidth <= 768) {
                // Small delay to allow for keyboard animation
                setTimeout(() => {
                    messageInputContainer.classList.remove('typing-mode');
                    document.body.classList.remove('mobile-typing');
                }, 300);
            }
        });

        // Auto-resize input
        messageInput.addEventListener('input', () => {
            this.autoResizeInput(messageInput);
        });
    }
    
    // Setup dynamic viewport handling for mobile keyboard
    setupMobileViewportHandler() {
        if (window.innerWidth > 768) return; // Only for mobile
        
        // Function to set app height based on viewport
        const setAppHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
            console.log(`Viewport height updated: ${window.innerHeight}px`);
        };
        
        // Set initial height
        setAppHeight();
        
        // Update height on resize (keyboard show/hide)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                setAppHeight();
            }, 100);
        });
        
        // Alternative method using visual viewport if available
        if (window.visualViewport) {
            const handleViewportChange = () => {
                const height = window.visualViewport.height;
                document.documentElement.style.setProperty('--app-height', `${height}px`);
                console.log(`Visual viewport height updated: ${height}px`);
            };
            
            window.visualViewport.addEventListener('resize', handleViewportChange);
        }
        
        // Handle input focus/blur for better keyboard management
        const messageInput = Utils.$('#message-input');
        if (messageInput) {
            messageInput.addEventListener('focus', () => {
                console.log('Input focused - keyboard should appear');
                // Delay to ensure keyboard is fully shown
                setTimeout(setAppHeight, 300);
            });
            
            messageInput.addEventListener('blur', () => {
                console.log('Input blurred - keyboard should hide');
                // Delay to ensure keyboard is fully hidden
                setTimeout(setAppHeight, 300);
            });
        }
    }

    autoResizeInput(element) {
        if (!element) return;
        
        // Reset height to calculate new height
        element.style.height = 'auto';
        
        // Calculate new height based on content
        const maxHeight = 80; // Match CSS max-height
        const newHeight = Math.min(element.scrollHeight, maxHeight);
        
        element.style.height = newHeight + 'px';
        
        // Add scrollbar if content exceeds max height
        if (element.scrollHeight > maxHeight) {
            element.style.overflowY = 'auto';
        } else {
            element.style.overflowY = 'hidden';
        }
    }

    // ENHANCED METHODS FOR IMPROVED NOTIFICATION FLOW

    // Immediate global counter update without animation delays
    updateGlobalUnreadCounterImmediate() {
        const totalUnread = this.calculateTotalUnreadCount();
        
        console.log(`🔔 updateGlobalUnreadCounterImmediate called - Total unread: ${totalUnread}`);
        
        // Use the correct elements - only manipulate the badge, not the container
        const globalUnreadBadge = document.getElementById('global-unread-badge');
        const globalUnreadCount = document.getElementById('global-unread-count');
        
        console.log(`🔍 DOM elements found:`, {
            badge: !!globalUnreadBadge,
            count: !!globalUnreadCount,
            badgeClasses: globalUnreadBadge?.className,
            countText: globalUnreadCount?.textContent
        });
        
        if (!globalUnreadBadge || !globalUnreadCount) {
            console.error('❌ Global notification elements not found');
            return;
        }

        const displayCount = totalUnread > 99 ? '99+' : totalUnread.toString();
        
        if (totalUnread > 0) {
            // Show badge immediately without animations
            console.log(`🔔 Showing global badge with count: ${displayCount}`);
            globalUnreadBadge.style.transition = 'none';
            globalUnreadBadge.classList.remove('hidden');
            globalUnreadBadge.style.display = 'flex';
            globalUnreadBadge.style.animation = 'none';
            globalUnreadCount.textContent = displayCount;
            
            console.log(`✅ Badge updated - Classes: ${globalUnreadBadge.className}, Display: ${globalUnreadBadge.style.display}`);
        } else {
            // Hide badge immediately without animations
            console.log(`🔕 Hiding global badge (no unread messages)`);
            globalUnreadBadge.style.transition = 'none';
            globalUnreadBadge.classList.add('hidden');
            globalUnreadBadge.style.display = 'none';
            globalUnreadBadge.style.animation = 'none';
            
            console.log(`✅ Badge hidden - Classes: ${globalUnreadBadge.className}, Display: ${globalUnreadBadge.style.display}`);
        }
        
        console.log(`✅ Global counter update completed: ${totalUnread} unread messages`);
    }

    // Update conversation item without flickering - DEPRECATED, use updateConversationItemSmart instead
    updateConversationItemWithoutFlicker(conversationId, conversation) {
        console.log(`Deprecated function called, redirecting to updateConversationItemSmart for: ${conversationId}`);
        return this.updateConversationItemSmart(conversationId, conversation);
    }

    // DEPRECATED: Use handleChatItemClick instead
    async selectConversationEnhanced(conversationId) {
        return this.handleChatItemClick(conversationId);
    }

    // Update browser title notification
    updateBrowserTitleNotification() {
        const totalUnread = this.calculateTotalUnreadCount();
        const originalTitle = document.title.replace(/^\(\d+\)\s*/, '');
        
        if (totalUnread > 0) {
            document.title = `(${totalUnread}) ${originalTitle}`;
        } else {
            document.title = originalTitle;
        }
    }

    // Optimized renderConversations to prevent flickering
    renderConversationsOptimized() {
        console.log('Optimized renderConversations called, conversations count:', this.conversations.size);
        
        const chatList = Utils.$('#chat-list');
        if (!chatList) {
            console.error('chat-list element not found');
            return;
        }

        // Check if we actually need to re-render by comparing conversation data
        if (this.lastRenderedConversationData) {
            const currentData = this.getConversationRenderData();
            if (this.isConversationDataSame(currentData, this.lastRenderedConversationData)) {
                console.log('Conversation data unchanged, skipping re-render to prevent flicker');
                return;
            }
        }

        // Store current data for next comparison
        this.lastRenderedConversationData = this.getConversationRenderData();

        if (this.conversations.size === 0) {
            if (!chatList.querySelector('.empty-state')) {
                chatList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <p>No hay conversaciones</p>
                        <button class="btn-primary" id="start-new-chat-btn">
                            Iniciar chat
                        </button>
                    </div>
                `;
                
                const startChatBtn = chatList.querySelector('#start-new-chat-btn');
                if (startChatBtn) {
                    startChatBtn.addEventListener('click', () => {
                        const contactsTab = document.querySelector('[data-tab="contacts"]');
                        if (contactsTab) {
                            contactsTab.click();
                            Utils.Notifications.info('Selecciona un contacto para iniciar una conversación');
                        }
                    });
                }
            }
            return;
        }

        // Use DocumentFragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        const sortedConversations = Array.from(this.conversations.values())
            .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

        sortedConversations.forEach(conversation => {
            const conversationElement = this.createConversationItem(conversation);
            fragment.appendChild(conversationElement);
        });

        // Replace content in one operation to minimize flicker
        chatList.innerHTML = '';
        chatList.appendChild(fragment);
        
        console.log('Optimized conversations rendered without flicker');
    }

    // Helper method to get render data for comparison
    getConversationRenderData() {
        const data = {};
        this.conversations.forEach((conv, id) => {
            data[id] = {
                name: conv.name,
                lastMessage: conv.lastMessage?.content?.text || '',
                lastActivity: conv.lastActivity,
                unreadCount: conv.unreadCount || 0,
                hasNewMessage: conv.hasNewMessage || false
            };
        });
        return data;
    }

    // Helper method to compare conversation data
    isConversationDataSame(current, previous) {
        if (!previous) return false;
        
        const currentKeys = Object.keys(current);
        const previousKeys = Object.keys(previous);
        
        if (currentKeys.length !== previousKeys.length) return false;
        
        for (const key of currentKeys) {
            if (!previous[key]) return false;
            
            const curr = current[key];
            const prev = previous[key];
            
            if (curr.name !== prev.name ||
                curr.lastMessage !== prev.lastMessage ||
                curr.lastActivity !== prev.lastActivity ||
                curr.unreadCount !== prev.unreadCount ||
                curr.hasNewMessage !== prev.hasNewMessage) {
                return false;
            }
        }
        
        return true;
    }

    // ANTI-FLICKER SYSTEM: Generate signature to detect real changes
    generateRenderSignature() {
        const conversations = Array.from(this.conversations.values());
        return conversations.map(conv => {
            return `${conv._id}:${conv.name}:${conv.unreadCount || 0}:${conv.lastActivity}:${conv.lastMessage?.content?.text || ''}`;
        }).sort().join('|');
    }

    // Smart conversation update - ROBUST version with multiple fallbacks
    updateConversationItemSmart(conversationId, newData) {
        // Simplified version to avoid complex dependencies
        return this.updateConversationItem(conversationId, newData);
    }

    // Batch update multiple conversations efficiently
    batchUpdateConversations(updates) {
        let hasAnyChanges = false;
        
        updates.forEach(({ conversationId, data }) => {
            const hasChanges = this.updateConversationItemSmart(conversationId, data);
            if (hasChanges) {
                hasAnyChanges = true;
            }
        });

        // Only update global counter if there were actual changes
        if (hasAnyChanges) {
            this.updateGlobalUnreadCounter();
        }

        return hasAnyChanges;
    }

    // HELPER FUNCTIONS FOR ROBUST BADGE MANAGEMENT
    
    // Find unread badge with multiple fallback selectors
    findUnreadBadge(chatItem) {
        // Try multiple possible selectors
        const selectors = [
            '.unread-badge-messenger',
            '.unread-badge',
            '.unread-count',
            '.badge',
            '[class*="unread"]',
            '[class*="badge"]'
        ];
        
        for (const selector of selectors) {
            const badge = chatItem.querySelector(selector);
            if (badge) {
                console.log(`🔍 Found badge with selector: ${selector}`);
                return badge;
            }
        }
        
        console.log(`🔍 No existing badge found in chat item`);
        return null;
    }
    
    // Create unread badge with robust fallback placement
    createUnreadBadge(chatItem, conversationId) {
        console.log(`🆕 Creating new badge for: ${conversationId}`);
        
        // Create badge element
        const badge = document.createElement('div');
        badge.className = 'unread-badge-messenger';
        badge.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            background: #25d366;
            color: white;
            border-radius: 50%;
            font-size: 12px;
            font-weight: bold;
            min-width: 18px;
            height: 18px;
            padding: 2px 4px;
            margin-left: 4px;
        `;
        
        // Try multiple placement strategies
        const placementSelectors = [
            '.chat-indicators',
            '.chat-time-container',
            '.chat-top-row',
            '.chat-info'
        ];
        
        for (const selector of placementSelectors) {
            const container = chatItem.querySelector(selector);
            if (container) {
                container.appendChild(badge);
                console.log(`✅ Badge created and placed in: ${selector}`);
                return badge;
            }
        }
        
        // Fallback: append to chat item directly
        chatItem.appendChild(badge);
        console.log(`✅ Badge created and placed as direct child of chat item`);
        return badge;
    }
    
    // Force re-render chat item with unread badge (nuclear option)
    forceUpdateChatItemWithBadge(conversationId, unreadCount) {
        console.log(`💥 Force updating chat item: ${conversationId} with count: ${unreadCount}`);
        
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!chatItem) return false;
        
        // Remove any existing badges
        const existingBadges = chatItem.querySelectorAll('[class*="badge"], [class*="unread"]');
        existingBadges.forEach(badge => badge.remove());
        
        // Add badge to HTML directly if unreadCount > 0
        if (unreadCount > 0) {
            const displayCount = unreadCount > 99 ? '99+' : unreadCount;
            const badgeHTML = `<div class="unread-badge-messenger" style="display: flex; align-items: center; justify-content: center; background: #25d366; color: white; border-radius: 50%; font-size: 12px; font-weight: bold; min-width: 18px; height: 18px; padding: 2px 4px; margin-left: 4px;">${displayCount}</div>`;
            
            // Try to inject into various containers
            const containers = [
                chatItem.querySelector('.chat-indicators'),
                chatItem.querySelector('.chat-time-container'),
                chatItem.querySelector('.chat-top-row')
            ];
            
            for (const container of containers) {
                if (container) {
                    container.insertAdjacentHTML('beforeend', badgeHTML);
                    console.log(`✅ Force-injected badge into container`);
                    return true;
                }
            }
            
            // Ultimate fallback
            chatItem.insertAdjacentHTML('beforeend', badgeHTML);
            console.log(`✅ Force-injected badge as direct child`);
            return true;
        }
        
        return false;
    }

    // SMOOTH CONVERSATION LOADING SYSTEM

    // Standard message loading like WhatsApp
    async loadConversationMessages(conversationId) {
        console.log(`📥 Loading conversation messages for: ${conversationId}`);

        try {
            this.setupElements();
            if (!this.messageContainer) {
                throw new Error('Message container not found');
            }

            // Show simple loading indicator centered
            this.messageContainer.innerHTML = '<div class="loading-indicator" style="display: flex; justify-content: center; align-items: center; height: 200px; font-size: 14px; color: #666;">Cargando mensajes...</div>';

            // Handle temporary conversations
            if (conversationId.startsWith('temp_')) {
                await this.handleTemporaryConversation(conversationId);
                return;
            }

            // Load messages
            const messages = await this.fetchMessages(conversationId);
            
            // Clear container and render messages
            this.messageContainer.innerHTML = '';
            
            if (messages && messages.length > 0) {
                messages.forEach(message => {
                    const messageElement = this.renderMessage(message);
                    if (messageElement) {
                        this.messageContainer.appendChild(messageElement);
                    }
                });
            }

            // Scroll to bottom (latest messages)
            this.scrollToBottom();

            console.log(`✅ Message loading completed for: ${conversationId}`);

        } catch (error) {
            console.error(`❌ Error loading messages:`, error);
            this.handleLoadingError(error, conversationId);
        }
    }

    // Handle temporary conversations (new conversations without messages)
    async handleTemporaryConversation(conversationId) {
        console.log('🆕 Handling temporary conversation:', conversationId);
        
        // Clear message container and show welcome screen
        if (this.messageContainer) {
            this.messageContainer.innerHTML = '';
        }
        
        // Show welcome message for new chat
        this.showWelcomeMessageForNewChat();
    }

    // Handle loading errors
    handleLoadingError(error, conversationId) {
        console.error('💥 Error loading conversation:', error);
        
        if (this.messageContainer) {
            this.messageContainer.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; color: #ff6b6b;"></i>
                    <p>Error al cargar los mensajes</p>
                    <button onclick="window.chatManager.loadConversationMessages('${conversationId}')" 
                            class="retry-btn" 
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                        Reintentar
                    </button>
                </div>
            `;
        }
        
        // Show alert for user feedback
        Utils.Alerts.error('Error al cargar la conversación');
    }

    // Simple message fetching
    async fetchMessages(conversationId) {
        const response = await fetch(`/api/messages/conversation/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data || !result.data.messages) {
            throw new Error('Invalid response format');
        }

        console.log(`📨 Fetched ${result.data.messages.length} messages`);
        return result.data.messages;
    }

    // Simple scroll to bottom
    scrollToBottom() {
        if (this.messageContainer) {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        }
    }





    // Standard chat item click handler - Clean like WhatsApp
    async handleChatItemClick(conversationId, conversationData = null) {
        try {
            // Get conversation data
            const conversation = conversationData || this.conversations.get(conversationId);
            if (!conversation) {
                Utils.Notifications.error('Conversación no encontrada');
                return;
            }

            // Set as current conversation
            this.currentConversation = conversation;
            this.updateActiveConversation();
            
            // Handle UI updates
            if (window.welcomeScreenManager) {
                window.welcomeScreenManager.setActiveConversation(true);
            }
            if (window.mobileNavigation?.onChatStarted) {
                window.mobileNavigation.onChatStarted();
            }
            
            // Join conversation room
            if (window.SocketManager?.isConnected) {
                window.SocketManager.joinConversation(conversationId);
            }
            
            // Load messages
            await this.loadConversationMessages(conversationId);
            
            // Mark as read and update counters
            await this.markConversationAsRead(conversationId);
            this.updateConversationItem(conversationId, { unreadCount: 0 });
            this.updateGlobalUnreadCounter();
            
        } catch (error) {
            console.error(`Error opening conversation:`, error);
            Utils.Notifications.error('Error al abrir la conversación');
        }
    }

    // Simple conversation item update
    updateConversationItem(conversationId, data) {
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!chatItem) return;

        // Update badge
        if (data.hasOwnProperty('unreadCount')) {
            let badge = chatItem.querySelector('.unread-badge-messenger');
            
            if (data.unreadCount > 0) {
                if (!badge) {
                    const indicators = chatItem.querySelector('.chat-indicators');
                    if (indicators) {
                        badge = document.createElement('div');
                        badge.className = 'unread-badge-messenger';
                        indicators.appendChild(badge);
                    }
                }
                if (badge) {
                    badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                    chatItem.classList.add('has-unread');
                }
            } else {
                if (badge) {
                    badge.remove();
                    chatItem.classList.remove('has-unread');
                }
            }
        }
    }

    // Load real conversation states from database
    async loadConversationStates() {
        console.log('📥 Loading real conversation states from database...');
        
        try {
            // Use existing conversations endpoint instead of non-existent /states endpoint
            const response = await fetch('/api/messages/conversations', {
                headers: {
                    'Authorization': `Bearer ${Utils.Storage.get('authToken')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('✅ Loaded conversation states:', result.data.length);
                
                // Update local conversations with real unread counts
                result.data.forEach(state => {
                    const conversation = this.conversations.get(state.conversationId);
                    if (conversation) {
                        conversation.unreadCount = state.unreadCount || 0;
                        conversation.lastReadMessageId = state.lastReadMessageId;
                        conversation.lastActivity = state.lastActivity;
                        
                        // Update UI with real data
                        this.updateConversationItem(state.conversationId, {
                            unreadCount: state.unreadCount || 0
                        });
                    }
                });
                
                // Update global counter with real data
                this.updateGlobalUnreadCounter();
                
                // Re-render conversations with updated data
                this.renderConversations();
                
            } else {
                console.warn('No conversation states received from API');
            }
            
        } catch (error) {
            console.error('❌ Error loading conversation states:', error);
            // Fallback: keep existing conversation data without simulation
        }
    }

    // Save unread count to database immediately - using socket instead of non-existent API
    async saveUnreadCountToDatabase(conversationId, unreadCount) {
        try {
            console.log(`💾 Saving unread count ${unreadCount} for conversation ${conversationId} via socket`);
            
            // Use socket to update unread count instead of non-existent API endpoint
            if (window.SocketManager?.isConnected) {
                window.SocketManager.emit('conversation:unread-count', {
                    conversationId,
                    unreadCount,
                    userId: this.currentUser?._id,
                    timestamp: new Date().toISOString()
                });
                console.log('✅ Unread count sent via socket');
                return true;
            } else {
                console.warn('⚠️ Socket not connected, unread count not saved');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Failed to save unread count to database:', error);
            // Continue operation even if DB save fails - better user experience
        }
    }

    // Simple global unread counter update
    updateGlobalUnreadCounter() {
        const totalUnread = this.calculateTotalUnreadCount();
        
        // Try multiple selectors for the notification badge
        const globalBadge = document.getElementById('global-unread-badge') || 
                           document.querySelector('.global-unread-badge') ||
                           document.querySelector('[data-role="global-notification-badge"]');
        
        const globalCount = document.getElementById('global-unread-count') ||
                           document.querySelector('.global-unread-count') ||
                           globalBadge?.querySelector('.count');
        
        console.log(`🔔 Updating global counter: ${totalUnread} unread messages`, {
            badge: !!globalBadge,
            count: !!globalCount,
            badgeElement: globalBadge?.tagName,
            countElement: globalCount?.tagName
        });
        
        if (globalBadge && globalCount) {
            if (totalUnread > 0) {
                globalBadge.style.display = 'flex';
                globalBadge.style.visibility = 'visible';
                globalBadge.classList.remove('hidden');
                globalCount.textContent = totalUnread > 99 ? '99+' : totalUnread;
                console.log(`✅ Badge shown with count: ${globalCount.textContent}`);
            } else {
                globalBadge.style.display = 'none';
                globalBadge.style.visibility = 'hidden';
                globalBadge.classList.add('hidden');
                console.log(`✅ Badge hidden (no unread messages)`);
            }
        } else {
            console.warn('❌ Global notification elements not found', {
                badgeSelector: '#global-unread-badge',
                countSelector: '#global-unread-count'
            });
        }
        
        // Also update browser title
        this.updateBrowserTitle(totalUnread);
    }

    // Calculate total unread messages
    calculateTotalUnreadCount() {
        let total = 0;
        for (const conversation of this.conversations.values()) {
            total += conversation.unreadCount || 0;
        }
        return total;
    }

    // Update browser title with unread count
    updateBrowserTitle(unreadCount) {
        const baseTitle = 'Chat Realtime';
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }

    // Helper method: Load messages with retry mechanism
    async loadMessagesWithRetry(conversationId, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📥 Loading messages attempt ${attempt}/${maxRetries} for: ${conversationId}`);
                await this.loadConversationMessages(conversationId);
                
                // Verify messages were actually loaded
                const messageContainer = document.getElementById('messages-scroll');
                const messages = messageContainer?.querySelectorAll('.message');
                
                if (messages && messages.length > 0) {
                    console.log(`✅ Messages loaded successfully: ${messages.length} messages`);
                    return true;
                } else if (attempt === maxRetries) {
                    console.warn(`⚠️ No messages found after ${maxRetries} attempts`);
                    return true; // Might be a new conversation with no messages
                }
                
            } catch (error) {
                console.error(`❌ Message loading attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) {
                    return false;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            }
        }
        return false;
    }

    // Helper method: Mark conversation as read robustly
    async markConversationAsReadRobustly(conversationId, conversation) {
        try {
            console.log(`📖 Starting robust read marking for: ${conversation.name}`);
            
            // 1. Update local conversation data
            const previousUnread = conversation.unreadCount || 0;
            conversation.unreadCount = 0;
            conversation.hasNewMessage = false;
            conversation.lastReadAt = new Date();
            
            // 2. Immediately update UI elements
            this.updateConversationItemSmart(conversationId, conversation);
            this.updateGlobalUnreadCounter();
            
            // 3. Send to server (background)
            if (window.SocketManager?.isConnected) {
                try {
                    window.SocketManager.markConversationAsRead(conversationId);
                    console.log('✅ Read status sent to server');
                } catch (serverError) {
                    console.warn('⚠️ Server update failed, but local update succeeded:', serverError);
                }
            }
            
            // 4. Update browser title
            this.updateBrowserTitleNotification();
            
            console.log(`✅ Conversation marked as read: ${previousUnread} → 0 messages`);
            
        } catch (error) {
            console.error('❌ Error marking conversation as read:', error);
        }
    }

    // Helper method: Update contact status robustly
    async updateContactStatusRobustly(conversation) {
        try {
            console.log('👤 Updating contact status robustly...');
            
            // Get recipient info
            const recipientId = this.getRecipientId();
            if (!recipientId) {
                console.warn('⚠️ No recipient ID found');
                return;
            }
            
            // Update contact presence and status
            const contactData = await this.getRealTimeContactData(recipientId);
            if (contactData) {
                console.log(`✅ Got contact data for ${recipientId}:`, contactData);
                
                // Update header with fresh data
                this.updateConversationHeaderPersistent(recipientId, contactData.status, contactData.lastSeen);
            }
            
        } catch (error) {
            console.error('❌ Error updating contact status:', error);
        }
    }

    // Helper method: Perform final UI updates
    async performFinalUIUpdates(conversationId, conversation, previousUnreadCount) {
        try {
            console.log('🎨 Performing final UI updates...');
            
            // 1. Auto-scroll to latest messages
            this.performRobustAutoScroll();
            
            // 2. Position verification
            setTimeout(() => {
                this.enforceMessagePositioningImmediate();
            }, 200);
            
            // 3. Initialize message position protection
            this.initializeMessagePositionProtector();
            
            // 4. Update active conversation highlighting
            this.updateActiveConversationHighlight(conversationId);
            
            // 5. Trigger any necessary re-renders
            if (previousUnreadCount > 0) {
                // Only trigger smart updates, not full re-render
                this.updateConversationItemSmart(conversationId, conversation);
            }
            
            console.log('✅ Final UI updates completed');
            
        } catch (error) {
            console.error('❌ Error in final UI updates:', error);
        }
    }

    // Helper method: Update chat item active state
    updateChatItemActiveState(conversationId, isActive) {
        try {
            // Remove active class from all items
            document.querySelectorAll('.chat-item.active').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to current item
            if (isActive) {
                const currentItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
                if (currentItem) {
                    currentItem.classList.add('active');
                    console.log(`✅ Chat item marked as active: ${conversationId}`);
                }
            }
        } catch (error) {
            console.error('❌ Error updating chat item active state:', error);
        }
    }

    // Helper method: Update active conversation highlight
    updateActiveConversationHighlight(conversationId) {
        try {
            // Ensure only the correct conversation is highlighted
            document.querySelectorAll('.chat-item').forEach(item => {
                const itemId = item.getAttribute('data-conversation-id');
                if (itemId === conversationId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        } catch (error) {
            console.error('❌ Error updating conversation highlight:', error);
        }
    }

    // Helper method: Recovery from click errors
    async recoverFromClickError(conversationId) {
        try {
            console.log(`🔧 Attempting recovery for conversation: ${conversationId}`);
            
            // Basic recovery: ensure UI is in consistent state
            this.isProcessingConversationClick = null;
            
            // Try to restore previous state
            const conversation = this.conversations.get(conversationId);
            if (conversation) {
                this.updateConversationItemSmart(conversationId, conversation);
            }
            
            // Clear any loading states
            const loadingElements = document.querySelectorAll('.loading');
            loadingElements.forEach(el => el.classList.remove('loading'));
            
            console.log('✅ Recovery completed');
            
        } catch (error) {
            console.error('❌ Recovery failed:', error);
        }
    }

    // DEBUG AND TESTING FUNCTIONS
    
    // Test function to verify indicator updates
    testIndicatorUpdates() {
        console.log('🧪 Testing indicator updates...');
        
        // Test 1: Check if global elements exist
        const globalBadge = document.getElementById('global-unread-badge');
        const globalCount = document.getElementById('global-unread-count');
        console.log('Global elements found:', { badge: !!globalBadge, count: !!globalCount });
        
        // Test 2: Check conversation data
        console.log('Current conversations:', this.conversations.size);
        this.conversations.forEach((conv, id) => {
            console.log(`  ${conv.name}: ${conv.unreadCount || 0} unread`);
        });
        
        // Test 3: Inspect actual DOM structure of chat items
        this.inspectChatItemStructure();
        
        // Test 4: Manual update
        this.updateGlobalUnreadCounter();
        
        // Test 5: Check first conversation badge
        if (this.conversations.size > 0) {
            const firstConv = Array.from(this.conversations.values())[0];
            console.log('Testing first conversation update:', firstConv.name);
            this.updateConversationItemSmart(firstConv._id, firstConv);
        }
    }

    // Debug function to inspect actual DOM structure
    inspectChatItemStructure() {
        console.log('🔍 Inspecting chat item DOM structure...');
        
        const chatItems = document.querySelectorAll('.chat-item');
        console.log(`Found ${chatItems.length} chat items`);
        
        chatItems.forEach((item, index) => {
            const conversationId = item.getAttribute('data-conversation-id');
            console.log(`\n📋 Chat Item ${index + 1} (ID: ${conversationId}):`);
            
            // Check overall structure
            console.log('  Classes:', item.className);
            console.log('  HTML structure:');
            console.log(item.innerHTML.substring(0, 500) + '...');
            
            // Look for indicators
            const chatIndicators = item.querySelector('.chat-indicators');
            const unreadBadge = item.querySelector('.unread-badge-messenger');
            const anyBadge = item.querySelector('[class*="badge"], [class*="unread"]');
            
            console.log('  Found elements:');
            console.log('    .chat-indicators:', !!chatIndicators);
            console.log('    .unread-badge-messenger:', !!unreadBadge);
            console.log('    Any badge-like element:', !!anyBadge);
            
            if (anyBadge) {
                console.log('    Badge element classes:', anyBadge.className);
                console.log('    Badge element content:', anyBadge.textContent);
            }
            
            // List all child elements with their classes
            const children = item.querySelectorAll('*');
            console.log('  All child elements:');
            children.forEach(child => {
                if (child.className) {
                    console.log(`    <${child.tagName.toLowerCase()} class="${child.className}">`);
                }
            });
        });
    }

    // Force reset all unread counts (for testing)
    forceResetAllUnreadCounts() {
        console.log('🔄 Force resetting all unread counts...');
        
        this.conversations.forEach((conversation, id) => {
            if (conversation.unreadCount > 0) {
                console.log(`Resetting ${conversation.name}: ${conversation.unreadCount} → 0`);
                conversation.unreadCount = 0;
                conversation.hasNewMessage = false;
                this.updateConversationItemSmart(id, conversation);
            }
        });
        
        this.updateGlobalUnreadCounter();
        console.log('✅ All unread counts reset');
    }

    // Simulate unread messages (for testing)
    // DEPRECATED - Use real database data instead  
    simulateUnreadMessages(count = 2) {
        console.warn('⚠️ simulateUnreadMessages is deprecated - using real database data');
        return;
        console.log(`🧪 Simulating ${count} unread messages...`);
        
        if (this.conversations.size > 0) {
            const firstConv = Array.from(this.conversations.values())[0];
            firstConv.unreadCount = count;
            firstConv.hasNewMessage = true;
            
            console.log(`Set ${firstConv.name} to ${count} unread messages`);
            this.updateConversationItem(firstConv._id, { unreadCount: count });
            this.updateGlobalUnreadCounter();
        }
    }

    // Force update all conversation badges (nuclear testing)
    forceUpdateAllBadges() {
        console.log('💥 Force updating all conversation badges...');
        
        this.conversations.forEach((conversation, id) => {
            const unreadCount = conversation.unreadCount || 0;
            console.log(`Force updating ${conversation.name}: ${unreadCount} unread`);
            this.forceUpdateChatItemWithBadge(id, unreadCount);
        });
        
        this.updateGlobalUnreadCounter();
        console.log('✅ All badges force updated');
    }

    // Test specific conversation badge update
    testConversationBadge(conversationId, count = 5) {
        console.log(`🧪 Testing badge update for conversation: ${conversationId} with count: ${count}`);
        
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return;
        }
        
        // Set unread count
        conversation.unreadCount = count;
        
        // Try all update methods
        console.log('Method 1: updateConversationItemSmart');
        this.updateConversationItemSmart(conversationId, conversation);
        
        setTimeout(() => {
            console.log('Method 2: forceUpdateChatItemWithBadge');
            this.forceUpdateChatItemWithBadge(conversationId, count);
        }, 1000);
        
        // Update global counter
        this.updateGlobalUnreadCounter();
    }

    // TEST SMOOTH LOADING SYSTEM
    
    // Test smooth loading for specific conversation
    testSmoothLoading(conversationId) {
        console.log(`🧪 Testing smooth loading for: ${conversationId}`);
        
        if (!conversationId && this.conversations.size > 0) {
            conversationId = Array.from(this.conversations.keys())[0];
        }
        
        if (!conversationId) {
            console.error('No conversation ID provided or available');
            return;
        }
        
        this.loadConversationMessages(conversationId);
    }

    // Test older message loading
    testOlderMessageLoading(conversationId) {
        console.log(`🧪 Testing older message loading for: ${conversationId}`);
        
        if (!conversationId && this.currentConversation) {
            conversationId = this.currentConversation._id;
        }
        
        if (!conversationId) {
            console.error('No conversation ID provided or current conversation available');
            return;
        }
        
        // Removed complex older message loading
    }

    // Test scroll behavior
    testScrollBehavior() {
        console.log(`🧪 Testing scroll behavior`);
        
        if (!this.messageContainer) {
            console.error('Message container not found');
            return;
        }
        
        console.log('Testing scroll to latest...');
        this.scrollToBottom();
        
        setTimeout(() => {
            console.log('Testing scroll to top...');
            this.messageContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 2000);
    }

    // Test loading states
    testLoadingStates() {
        console.log(`🧪 Testing loading states`);
        
        // Test main loading state
        this.showSmoothLoadingState('test-conversation');
        
        setTimeout(() => {
            this.hideSmoothLoadingState();
        }, 3000);
        
        // Test older messages loading
        setTimeout(() => {
            this.showOlderMessagesLoading();
            
            setTimeout(() => {
                this.hideOlderMessagesLoading();
            }, 2000);
        }, 4000);
    }

    // Test error handling
    testErrorHandling() {
        console.log(`🧪 Testing error handling`);
        
        this.handleLoadingError(new Error('Test error'), 'test-conversation-id');
    }

    // DEBUG COUNTER UPDATE FLOW
    debugCounterFlow(conversationId) {
        if (!conversationId && this.conversations.size > 0) {
            conversationId = Array.from(this.conversations.keys())[0];
        }
        
        if (!conversationId) {
            console.error('No conversation ID provided or available');
            return;
        }
        
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return;
        }
        
        console.log('🔍 DEBUGGING COUNTER FLOW');
        console.log('========================');
        
        // Step 1: Show current state
        console.log('1. Current conversation state:');
        console.log(`   - Name: ${conversation.name}`);
        console.log(`   - Unread Count: ${conversation.unreadCount || 0}`);
        console.log(`   - Has New Message: ${conversation.hasNewMessage || false}`);
        
        // Step 2: Check DOM elements
        console.log('2. Checking DOM elements:');
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        console.log(`   - Chat Item Found: ${!!chatItem}`);
        
        if (chatItem) {
            const badge = this.findUnreadBadge(chatItem);
            console.log(`   - Badge Found: ${!!badge}`);
            if (badge) {
                console.log(`   - Badge Content: "${badge.textContent}"`);
                console.log(`   - Badge Display: "${badge.style.display}"`);
                console.log(`   - Badge Classes: "${badge.className}"`);
            }
        }
        
        // Step 3: Check global counter
        console.log('3. Checking global counter:');
        const totalUnread = this.calculateTotalUnreadCount();
        console.log(`   - Total Unread Calculated: ${totalUnread}`);
        
        const globalBadge = document.getElementById('global-unread-badge');
        const globalCount = document.getElementById('global-unread-count');
        console.log(`   - Global Badge Found: ${!!globalBadge}`);
        console.log(`   - Global Count Found: ${!!globalCount}`);
        
        if (globalBadge && globalCount) {
            console.log(`   - Global Badge Display: "${globalBadge.style.display}"`);
            console.log(`   - Global Badge Classes: "${globalBadge.className}"`);
            console.log(`   - Global Count Text: "${globalCount.textContent}"`);
        }
        
        // Step 4: Test manual update
        console.log('4. Testing manual updates:');
        console.log('   - Setting conversation to 0 unread...');
        conversation.unreadCount = 0;
        conversation.hasNewMessage = false;
        
        console.log('   - Calling updateConversationItemSmart...');
        this.updateConversationItemSmart(conversationId, conversation);
        
        console.log('   - Calling updateGlobalUnreadCounterImmediate...');
        this.updateGlobalUnreadCounter();
        
        // Step 5: Verify changes
        setTimeout(() => {
            console.log('5. Verifying changes after update:');
            const updatedBadge = this.findUnreadBadge(chatItem);
            console.log(`   - Badge after update: ${!!updatedBadge}`);
            if (updatedBadge) {
                console.log(`   - Badge Display: "${updatedBadge.style.display}"`);
                console.log(`   - Badge Content: "${updatedBadge.textContent}"`);
            }
            
            if (globalBadge && globalCount) {
                console.log(`   - Global Badge Display: "${globalBadge.style.display}"`);
                console.log(`   - Global Count Text: "${globalCount.textContent}"`);
            }
            
            console.log('========================');
            console.log('🔍 Counter flow debugging completed');
        }, 500);
    }

    // Test complete conversation click flow with counter debugging
    testCompleteConversationFlow(conversationId) {
        if (!conversationId && this.conversations.size > 0) {
            conversationId = Array.from(this.conversations.keys())[0];
        }
        
        if (!conversationId) {
            console.error('No conversation ID provided or available');
            return;
        }
        
        console.log(`🧪 Testing complete conversation flow for: ${conversationId}`);
        
        // First, set some unread messages to test
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            conversation.unreadCount = 3;
            conversation.hasNewMessage = true;
            this.updateConversationItemSmart(conversationId, conversation);
            this.updateGlobalUnreadCounter();
            
            console.log('Set conversation to 3 unread messages');
            
            // Wait a bit, then simulate conversation click
            setTimeout(() => {
                console.log('Now simulating conversation click...');
                this.handleChatItemClick(conversationId, conversation);
            }, 2000);
        }
    }
}

// Initialize chat manager when Utils is available
const initChatManager = () => {
    try {
        if (typeof Utils !== 'undefined') {
            console.log('🚀 Initializing ChatManager...');
            window.Chat = new ChatManager();
            window.chatManager = window.Chat; // For compatibility with contacts.js
            console.log('✅ ChatManager created successfully');
            
            // Initialize with current user if available
            const currentUser = window.AuthManager ? window.AuthManager.getCurrentUser() : Utils.Storage.get('currentUser');
            if (currentUser) {
                console.log('👤 Initializing with current user:', currentUser.username);
                window.Chat.initialize(currentUser);
            } else {
                console.log('⚠️ No current user found for ChatManager initialization');
            }
            
            // Listen for authentication events to update current user
            if (window.Utils && Utils.EventBus) {
                Utils.EventBus.on('auth:login-success', (data) => {
                    if (data.user && window.Chat) {
                        console.log('🔄 Re-initializing ChatManager with logged-in user');
                        window.Chat.initialize(data.user);
                    }
                });
            }
        } else {
            console.log('⏳ Waiting for Utils to be available...');
            setTimeout(initChatManager, 10);
        }
    } catch (error) {
        console.error('❌ Error initializing ChatManager:', error);
        setTimeout(initChatManager, 100); // Retry after longer delay
    }
};

initChatManager();

// Limpiar intervalos cuando se cierre la ventana
window.addEventListener('beforeunload', () => {
    if (window.chatManager) {
        window.chatManager.stopIndicatorUpdates();
        window.chatManager.stopConversationUpdates();
    }
});

// ForwardManager class for handling message forwarding
class ForwardManager {
    constructor() {
        this.currentMessage = null;
        this.selectedContacts = new Set();
        this.contactsData = new Map();
        this.searchTimeout = null;
        
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.modal = document.getElementById('forward-message-modal');
        this.messagePreview = document.getElementById('forward-message-content');
        this.searchInput = document.getElementById('forward-contact-search');
        this.contactsList = document.getElementById('forward-contacts-list');
        this.selectedSection = document.getElementById('selected-contacts-section');
        this.selectedList = document.getElementById('selected-contacts-list');
        this.confirmBtn = document.getElementById('confirm-forward');
        this.additionalTextInput = document.getElementById('forward-additional-text');
        this.charCount = document.getElementById('char-count');
        this.forwardCount = this.confirmBtn?.querySelector('.forward-count');
        this.selectAllCheckbox = document.getElementById('select-all-contacts');
        
        console.log('ForwardManager elements initialized:', {
            modal: !!this.modal,
            contactsList: !!this.contactsList,
            searchInput: !!this.searchInput,
            confirmBtn: !!this.confirmBtn
        });
    }
    
    bindEvents() {
        // Close modal events
        const closeBtn = document.getElementById('close-forward-modal');
        const cancelBtn = document.getElementById('cancel-forward');
        const overlay = this.modal?.querySelector('.modal-overlay');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
        if (overlay) overlay.addEventListener('click', () => this.closeModal());
        
        // Search input events
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Clear selection
        const clearBtn = document.getElementById('clear-selection');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelection());
        }
        
        // Confirm forward
        if (this.confirmBtn) {
            this.confirmBtn.addEventListener('click', () => this.confirmForward());
        }
        
        // Character count for additional message
        if (this.additionalTextInput && this.charCount) {
            this.additionalTextInput.addEventListener('input', () => this.updateCharCount());
        }
        
        // Select all contacts
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', () => this.toggleSelectAll());
        }
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal?.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }
    
    openForwardModal(message) {
        console.log('Opening forward modal for message:', message);
        this.currentMessage = message;
        this.selectedContacts.clear();
        
        // Clear search input
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // Clear additional text input
        if (this.additionalTextInput) {
            this.additionalTextInput.value = '';
        }
        
        // Reset select all checkbox
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.checked = false;
            this.selectAllCheckbox.indeterminate = false;
        }
        
        // Show message preview
        this.showMessagePreview(message);
        
        // Load contacts
        console.log('Loading contacts...');
        this.loadContacts();
        
        // Show modal
        if (this.modal) {
            this.modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            console.log('Modal shown');
            
            // Focus search input
            setTimeout(() => {
                if (this.searchInput) {
                    this.searchInput.focus();
                }
            }, 100);
        } else {
            console.error('Modal element not found');
        }
        
        this.updateUI();
    }
    
    showMessagePreview(message) {
        if (!this.messagePreview) return;
        
        const senderName = message.sender.fullName || message.sender.username;
        const messageText = Utils.truncateText(message.content.text, 100);
        
        this.messagePreview.innerHTML = `
            <div class="message-preview-item">
                <div class="preview-sender">
                    <img src="${message.sender.avatar || '/images/user-placeholder-32.svg'}" 
                         alt="${senderName}" class="sender-avatar">
                    <span class="sender-name">${senderName}</span>
                </div>
                <div class="preview-text">${messageText}</div>
            </div>
        `;
    }
    
    async loadContacts() {
        if (!this.contactsList) return;
        
        // Show loading state
        this.contactsList.innerHTML = `
            <div class="no-contacts">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando contactos...</p>
            </div>
        `;
        
        try {
            let contacts = [];
            
            // Primero intentar obtener contactos del contactsManager si está disponible
            if (window.contactsManager && window.contactsManager.contacts && window.contactsManager.contacts.size > 0) {
                contacts = Array.from(window.contactsManager.contacts.values());
                console.log('Loading contacts from contactsManager:', contacts.length);
            } else {
                // Si no hay contactos en el manager, cargar desde la API
                console.log('Loading contacts from API...');
                const response = await API.Contacts.getContacts();
                if (response.success && response.data) {
                    contacts = response.data;
                    console.log('Loaded contacts from API:', contacts.length);
                } else {
                    console.warn('No contacts received from API:', response);
                }
            }
            
            if (contacts && contacts.length > 0) {
                this.displayContacts(contacts);
            } else {
                this.contactsList.innerHTML = `
                    <div class="no-contacts">
                        <i class="fas fa-users"></i>
                        <p>No tienes contactos disponibles para reenviar</p>
                        <small>Agrega contactos para poder reenviar mensajes</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading contacts for forward:', error);
            this.contactsList.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar contactos</p>
                    <small>Inténtalo de nuevo más tarde</small>
                </div>
            `;
        }
    }
    
    displayContacts(contacts) {
        if (!this.contactsList) {
            console.error('contactsList element not found');
            return;
        }
        
        console.log('Displaying contacts:', contacts.length, contacts);
        
        if (!contacts || !contacts.length) {
            this.contactsList.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-users"></i>
                    <p>No tienes contactos disponibles</p>
                </div>
            `;
            return;
        }
        
        // Store contacts data
        this.contactsData.clear();
        contacts.forEach(contact => {
            this.contactsData.set(contact._id, contact);
        });
        
        const contactsHTML = contacts.map(contact => {
            const isSelected = this.selectedContacts.has(contact._id);
            const statusClass = contact.status === 'online' ? 'online' : 'offline';
            
            return `
                <div class="forward-contact-item ${isSelected ? 'selected' : ''}" data-contact-id="${contact._id}">
                    <div class="contact-avatar-wrapper">
                        <img src="${contact.avatar || '/images/user-placeholder-40.svg'}" 
                             alt="${contact.fullName}" class="contact-avatar">
                        <div class="status-indicator ${statusClass}"></div>
                    </div>
                    <div class="contact-info">
                        <div class="contact-name">${Utils.escapeHtml(contact.fullName || contact.username)}</div>
                        <div class="contact-username">@${Utils.escapeHtml(contact.username)}</div>
                    </div>
                    <div class="contact-action">
                        <span class="selection-status ${isSelected ? 'selected' : ''}" data-contact-id="${contact._id}">
                            <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-circle'}"></i>
                            <span>${isSelected ? 'Seleccionado' : 'Seleccionar'}</span>
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('Generated HTML for contacts:', contactsHTML.substring(0, 200) + '...');
        console.log('Setting innerHTML on element:', this.contactsList);
        console.log('Element ID:', this.contactsList.id);
        console.log('Element classes:', this.contactsList.className);
        
        // Clear the element first
        this.contactsList.innerHTML = '';
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            this.contactsList.innerHTML = contactsHTML;
            
            console.log('HTML after setting:', this.contactsList.innerHTML.substring(0, 200) + '...');
            console.log('Children count:', this.contactsList.children.length);
            
            // Force a reflow to ensure the DOM updates
            this.contactsList.offsetHeight;
            
            // Bind contact selection events
            this.bindContactEvents();
            
            // Double check that children are visible
            const items = this.contactsList.querySelectorAll('.forward-contact-item');
            console.log('Contact items found:', items.length);
            items.forEach((item, index) => {
                console.log(`Item ${index}:`, item.style.display, item.offsetHeight);
            });
            
            // Check container visibility
            const container = this.contactsList.parentElement;
            console.log('Container visibility:', {
                display: getComputedStyle(container).display,
                visibility: getComputedStyle(container).visibility,
                height: container.offsetHeight,
                overflow: getComputedStyle(container).overflow
            });
            
            console.log('ContactsList visibility:', {
                display: getComputedStyle(this.contactsList).display,
                visibility: getComputedStyle(this.contactsList).visibility,
                height: this.contactsList.offsetHeight,
                scrollHeight: this.contactsList.scrollHeight
            });
        }, 10);
    }
    
    bindContactEvents() {
        console.log('Binding contact events...');
        
        // Handle contact item clicks
        const contactItems = this.contactsList.querySelectorAll('.forward-contact-item');
        console.log('Found contact items:', contactItems.length);
        
        contactItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = item.dataset.contactId;
                console.log('Contact item clicked:', contactId);
                this.toggleContactSelection(contactId);
            });
        });
        
        // Handle selection status clicks specifically
        const selectionButtons = this.contactsList.querySelectorAll('.selection-status');
        console.log('Found selection buttons:', selectionButtons.length);
        
        selectionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = button.dataset.contactId;
                console.log('Selection button clicked for contact:', contactId);
                this.toggleContactSelection(contactId);
            });
        });
    }
    
    toggleContactSelection(contactId) {
        if (this.selectedContacts.has(contactId)) {
            this.selectedContacts.delete(contactId);
        } else {
            this.selectedContacts.add(contactId);
        }
        
        this.updateContactItem(contactId);
        this.updateSelectedContactsList();
        this.updateUI();
    }
    
    updateContactItem(contactId) {
        const item = this.contactsList.querySelector(`[data-contact-id="${contactId}"]`);
        const status = this.contactsList.querySelector(`[data-contact-id="${contactId}"] .selection-status`);
        
        if (item && status) {
            const isSelected = this.selectedContacts.has(contactId);
            
            // Update item appearance
            if (isSelected) {
                item.classList.add('selected');
                status.classList.add('selected');
                status.innerHTML = '<i class="fas fa-check-circle"></i><span>Seleccionado</span>';
            } else {
                item.classList.remove('selected');
                status.classList.remove('selected');
                status.innerHTML = '<i class="fas fa-circle"></i><span>Seleccionar</span>';
            }
        }
    }
    
    updateSelectedContactsList() {
        if (!this.selectedList) return;
        
        const selectedArray = Array.from(this.selectedContacts);
        const modalBody = this.modal?.querySelector('.modal-body');
        
        if (selectedArray.length === 0) {
            this.selectedSection.classList.add('hidden');
            if (modalBody) modalBody.classList.remove('has-selected-contacts');
            return;
        }
        
        this.selectedSection.classList.remove('hidden');
        if (modalBody) modalBody.classList.add('has-selected-contacts');
        
        this.selectedList.innerHTML = selectedArray.map(contactId => {
            const contact = this.contactsData.get(contactId);
            if (!contact) return '';
            
            return `
                <div class="selected-contact-item" data-contact-id="${contactId}">
                    <img src="${contact.avatar || '/images/user-placeholder-32.svg'}" 
                         alt="${contact.fullName}" class="selected-avatar">
                    <span class="selected-name">${Utils.escapeHtml(contact.fullName || contact.username)}</span>
                    <button class="remove-selected" data-contact-id="${contactId}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        // Bind remove events
        this.selectedList.querySelectorAll('.remove-selected').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = btn.dataset.contactId;
                this.toggleContactSelection(contactId);
            });
        });
    }
    
    handleSearch(query) {
        console.log('Search query:', query);
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Set new timeout for search (debounce)
        this.searchTimeout = setTimeout(() => {
            this.filterContacts(query);
        }, 300);
    }
    
    filterContacts(query) {
        console.log('Filtering contacts with query:', query);
        console.log('Available contacts data:', this.contactsData.size);
        
        if (!query.trim()) {
            // Show all contacts
            this.loadContacts();
            return;
        }
        
        const filteredContacts = Array.from(this.contactsData.values()).filter(contact => {
            const searchText = query.toLowerCase();
            const fullName = (contact.fullName || '').toLowerCase();
            const username = (contact.username || '').toLowerCase();
            
            const matches = fullName.includes(searchText) || username.includes(searchText);
            console.log(`Contact ${contact.fullName} matches: ${matches}`);
            return matches;
        });
        
        console.log('Filtered contacts:', filteredContacts.length);
        this.displayContacts(filteredContacts);
    }
    
    clearSelection() {
        this.selectedContacts.clear();
        this.updateSelectedContactsList();
        this.loadContacts(); // Reload to update selection states
        this.updateUI();
    }
    
    toggleSelectAll() {
        const isChecked = this.selectAllCheckbox?.checked;
        const allContacts = Array.from(this.contactsData.keys());
        
        if (isChecked) {
            // Select all contacts
            allContacts.forEach(contactId => {
                this.selectedContacts.add(contactId);
                this.updateContactItem(contactId);
            });
        } else {
            // Deselect all contacts
            this.selectedContacts.clear();
            allContacts.forEach(contactId => {
                this.updateContactItem(contactId);
            });
        }
        
        this.updateSelectedContactsList();
        this.updateUI();
    }
    
    updateUI() {
        const count = this.selectedContacts.size;
        const totalContacts = this.contactsData.size;
        
        // Update confirm button with intuitive text
        if (this.confirmBtn) {
            this.confirmBtn.disabled = count === 0;
            
            if (count === 0) {
                this.confirmBtn.innerHTML = '<i class="fas fa-share"></i> Selecciona contactos';
            } else if (count === 1) {
                this.confirmBtn.innerHTML = `<i class="fas fa-share"></i> Compartir con 1 contacto`;
            } else {
                this.confirmBtn.innerHTML = `<i class="fas fa-share"></i> Compartir con ${count} contactos`;
            }
        }
        
        // Update select all checkbox state
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.checked = count === totalContacts && totalContacts > 0;
            this.selectAllCheckbox.indeterminate = count > 0 && count < totalContacts;
        }
        
        // Update count display if exists
        if (this.forwardCount) {
            this.forwardCount.textContent = count.toString();
        }
    }
    
    async confirmForward() {
        // Validation
        if (this.selectedContacts.size === 0) {
            Utils.Notifications.error('Selecciona al menos un contacto para reenviar');
            return;
        }
        
        if (!this.currentMessage) {
            Utils.Notifications.error('No hay mensaje para reenviar');
            return;
        }
        
        if (!window.SocketManager || !window.SocketManager.isConnected) {
            Utils.Notifications.error('No hay conexión. Verifica tu internet');
            return;
        }
        
        const contactIds = Array.from(this.selectedContacts);
        const confirmBtn = this.confirmBtn;
        
        try {
            // Disable button and show loading
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reenviando...';
            }
            
            // Get additional message text (optional)
            const additionalText = this.additionalTextInput?.value?.trim() || '';
            
            // Validate message content
            if (!this.currentMessage.content || !this.currentMessage.content.text) {
                throw new Error('El mensaje original no tiene contenido válido');
            }
            
            // Send message to each selected contact
            let successCount = 0;
            for (const contactId of contactIds) {
                try {
                    // Validate contact ID
                    if (!contactId || typeof contactId !== 'string') {
                        console.warn('Invalid contact ID:', contactId);
                        continue;
                    }
                    
                    // Create forward data
                    const forwardData = {
                        isForwarded: true,
                        originalMessage: this.currentMessage._id,
                        originalSender: this.currentMessage.sender,
                        originalContent: this.currentMessage.content.text,
                        originalType: this.currentMessage.type || 'text',
                        originalAttachments: this.currentMessage.attachments || []
                    };
                    
                    // Send via socket with proper error handling
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Timeout sending message'));
                        }, 10000); // 10 second timeout
                        
                        try {
                            window.SocketManager.sendForwardedMessage(contactId, additionalText, forwardData);
                            clearTimeout(timeout);
                            resolve();
                        } catch (error) {
                            clearTimeout(timeout);
                            reject(error);
                        }
                    });
                    
                    successCount++;
                } catch (error) {
                    console.error(`Error forwarding to contact ${contactId}:`, error);
                }
            }
            
            // Show success notification
            if (successCount > 0) {
                const contactNames = contactIds.slice(0, successCount).map(id => {
                    const contact = this.contactsData.get(id);
                    return contact ? (contact.fullName || contact.username) : 'Usuario';
                });
                
                const message = successCount === 1 
                    ? `Mensaje reenviado a ${contactNames[0]}`
                    : `Mensaje reenviado a ${successCount} contacto${successCount > 1 ? 's' : ''}`;
                Utils.Notifications.success(message);
                
                // Close modal on success
                this.closeModal();
            } else {
                Utils.Notifications.error('No se pudo reenviar el mensaje a ningún contacto');
                
                // Restore button
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    this.updateUI();
                }
            }
            
        } catch (error) {
            console.error('Error forwarding message:', error);
            Utils.Notifications.error(error.message || 'Error al reenviar el mensaje');
            
            // Restore button
            if (confirmBtn) {
                confirmBtn.disabled = false;
                this.updateUI();
            }
        }
    }
    
    updateCharCount() {
        if (!this.additionalTextInput || !this.charCount) return;
        
        const length = this.additionalTextInput.value.length;
        this.charCount.textContent = length;
        
        // Update styling based on character count
        this.charCount.parentElement.classList.remove('warning', 'error');
        if (length > 400) {
            this.charCount.parentElement.classList.add('warning');
        }
        if (length >= 500) {
            this.charCount.parentElement.classList.add('error');
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }
        
        // Reset state
        this.currentMessage = null;
        this.selectedContacts.clear();
        this.contactsData.clear();
        
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // Clear additional message input
        if (this.additionalTextInput) {
            this.additionalTextInput.value = '';
            this.updateCharCount();
        }
        
        this.updateUI();
    }
}

// Initialize ForwardManager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.forwardManager = new ForwardManager();
    
    // Start real-time presence monitoring if Chat is available
    if (window.Chat && typeof window.Chat.startPresenceMonitoring === 'function') {
        window.Chat.startPresenceMonitoring();
    }
});

// Test function to simulate message delivery - for debugging
window.testMessageDelivery = function() {
    console.log('🧪 Testing message delivery simulation...');
    
    // Find the most recent sent message
    const sentMessages = document.querySelectorAll('.message.sent');
    if (sentMessages.length > 0) {
        const lastMessage = sentMessages[sentMessages.length - 1];
        const messageId = lastMessage.getAttribute('data-message-id');
        const clientId = lastMessage.getAttribute('data-client-id');
        
        console.log('🧪 Simulating delivery for message:', messageId, 'clientId:', clientId);
        
        // Simulate the delivered event
        if (window.Chat && window.Chat.handleMessageDelivered) {
            window.Chat.handleMessageDelivered({
                messageId: messageId,
                clientId: clientId,
                deliveredAt: Date.now()
            });
        }
    } else {
        console.log('🧪 No sent messages found to test delivery');
    }
};