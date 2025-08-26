/**
 * CameraHandler - Sistema robusto e independiente para manejo de cámara
 * Soluciona problemas de eventos conflictivos y abre al primer clic
 */
class CameraHandler {
    constructor() {
        this.currentStream = null;
        this.currentFacingMode = 'user';
        this.capturedPhotoBlob = null;
        this.isInitialized = false;
        this.modal = null;
        this.video = null;
        this.canvas = null;
        this.preview = null;
        this.previewImg = null;
        
        console.log('CameraHandler initialized');
    }
    
    /**
     * Método principal para abrir la cámara - garantiza apertura al primer clic
     */
    async openCamera() {
        try {
            console.log('CameraHandler: Opening camera...');
            
            // Limpiar cualquier modal existente
            this.cleanup();
            
            // Crear el modal
            this.createModal();
            
            // Mostrar el modal inmediatamente
            this.showModal();
            
            // Inicializar la cámara
            await this.initCamera();
            
            return true;
        } catch (error) {
            console.error('CameraHandler: Error opening camera:', error);
            this.showError('Error abriendo cámara: ' + error.message);
            this.cleanup();
            return false;
        }
    }
    
    /**
     * Crear el modal de la cámara
     */
    createModal() {
        console.log('CameraHandler: Creating modal...');
        
        this.modal = document.createElement('div');
        this.modal.id = 'vigichat-camera-modal';
        this.modal.className = 'vigichat-camera-modal';
        this.modal.innerHTML = `
            <div class="vigichat-camera-overlay"></div>
            <div class="vigichat-camera-content">
                <div class="vigichat-camera-header">
                    <h3>Tomar Foto</h3>
                    <button class="vigichat-camera-close" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="vigichat-camera-body">
                    <video id="vigichat-camera-video" autoplay playsinline muted></video>
                    <canvas id="vigichat-camera-canvas" style="display: none;"></canvas>
                    <div class="vigichat-camera-preview" id="vigichat-camera-preview" style="display: none;">
                        <img id="vigichat-preview-image" alt="Foto capturada">
                    </div>
                    <div class="vigichat-camera-loading">
                        <div class="vigichat-loading-spinner"></div>
                        <p>Accediendo a la cámara...</p>
                    </div>
                </div>
                <div class="vigichat-camera-controls">
                    <button id="vigichat-camera-switch" class="vigichat-camera-btn secondary" type="button">
                        <i class="fas fa-sync-alt"></i>
                        <span>Cambiar</span>
                    </button>
                    <button id="vigichat-camera-capture" class="vigichat-camera-btn primary" type="button">
                        <i class="fas fa-camera"></i>
                        <span>Capturar</span>
                    </button>
                    <button id="vigichat-camera-retake" class="vigichat-camera-btn secondary" style="display: none;" type="button">
                        <i class="fas fa-redo"></i>
                        <span>Repetir</span>
                    </button>
                    <button id="vigichat-camera-send" class="vigichat-camera-btn success" style="display: none;" type="button">
                        <i class="fas fa-paper-plane"></i>
                        <span>Enviar</span>
                    </button>
                </div>
            </div>
        `;
        
        // Obtener referencias a elementos
        this.video = this.modal.querySelector('#vigichat-camera-video');
        this.canvas = this.modal.querySelector('#vigichat-camera-canvas');
        this.preview = this.modal.querySelector('#vigichat-camera-preview');
        this.previewImg = this.modal.querySelector('#vigichat-preview-image');
        
        // Configurar eventos
        this.setupEvents();
        
        // Añadir al DOM
        document.body.appendChild(this.modal);
        
        console.log('CameraHandler: Modal created and added to DOM');
    }
    
    /**
     * Configurar todos los eventos del modal
     */
    setupEvents() {
        const closeBtn = this.modal.querySelector('.vigichat-camera-close');
        const overlay = this.modal.querySelector('.vigichat-camera-overlay');
        const captureBtn = this.modal.querySelector('#vigichat-camera-capture');
        const retakeBtn = this.modal.querySelector('#vigichat-camera-retake');
        const sendBtn = this.modal.querySelector('#vigichat-camera-send');
        const switchBtn = this.modal.querySelector('#vigichat-camera-switch');
        
        // Eventos de cerrar
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeCamera();
        });
        
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeCamera();
        });
        
        // Eventos de botones
        captureBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.capturePhoto();
        });
        
        retakeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.retakePhoto();
        });
        
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.sendPhoto();
        });
        
        switchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.switchCamera();
        });
        
        // Prevenir eventos de propagación en todo el modal
        this.modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        console.log('CameraHandler: Events configured');
    }
    
    /**
     * Mostrar el modal con animación
     */
    showModal() {
        console.log('CameraHandler: Showing modal...');
        
        // Forzar reflow para asegurar que el elemento está en el DOM
        this.modal.offsetHeight;
        
        // Mostrar modal
        requestAnimationFrame(() => {
            this.modal.classList.add('vigichat-show');
        });
    }
    
    /**
     * Inicializar la cámara
     */
    async initCamera() {
        try {
            console.log('CameraHandler: Initializing camera...');
            
            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 }
                }
            };
            
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
            
            // Esperar a que el video esté listo
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    console.log('CameraHandler: Video metadata loaded');
                    resolve();
                };
            });
            
            // Ocultar loading y mostrar video
            const loading = this.modal.querySelector('.vigichat-camera-loading');
            if (loading) {
                loading.style.display = 'none';
            }
            
            this.video.style.display = 'block';
            this.isInitialized = true;
            
            this.showSuccess('Cámara lista');
            console.log('CameraHandler: Camera initialized successfully');
            
        } catch (error) {
            console.error('CameraHandler: Error initializing camera:', error);
            throw new Error('No se pudo acceder a la cámara: ' + error.message);
        }
    }
    
    /**
     * Cambiar entre cámara frontal y trasera
     */
    async switchCamera() {
        try {
            console.log('CameraHandler: Switching camera...');
            
            this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
            
            // Detener stream actual
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }
            
            // Mostrar loading
            const loading = this.modal.querySelector('.vigichat-camera-loading');
            if (loading) {
                loading.style.display = 'flex';
            }
            this.video.style.display = 'none';
            
            // Reinicializar con nueva cámara
            await this.initCamera();
            
            this.showSuccess('Cámara cambiada');
            
        } catch (error) {
            console.error('CameraHandler: Error switching camera:', error);
            this.showError('Error cambiando cámara');
        }
    }
    
    /**
     * Capturar foto
     */
    capturePhoto() {
        try {
            console.log('CameraHandler: Capturing photo...');
            
            if (!this.isInitialized || !this.video.videoWidth) {
                this.showError('La cámara no está lista');
                return;
            }
            
            // Configurar canvas
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            // Dibujar frame actual
            const ctx = this.canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0);
            
            // Convertir a blob
            this.canvas.toBlob((blob) => {
                if (blob) {
                    this.capturedPhotoBlob = blob;
                    const url = URL.createObjectURL(blob);
                    this.previewImg.src = url;
                    
                    // Mostrar preview
                    this.showPreview();
                    
                    this.showSuccess('Foto capturada');
                    console.log('CameraHandler: Photo captured successfully');
                } else {
                    this.showError('Error capturando foto');
                }
            }, 'image/jpeg', 0.9);
            
        } catch (error) {
            console.error('CameraHandler: Error capturing photo:', error);
            this.showError('Error capturando foto');
        }
    }
    
    /**
     * Mostrar vista previa de foto capturada
     */
    showPreview() {
        // Ocultar video y mostrar preview
        this.video.style.display = 'none';
        this.preview.style.display = 'flex';
        
        // Cambiar botones
        const captureBtn = this.modal.querySelector('#vigichat-camera-capture');
        const retakeBtn = this.modal.querySelector('#vigichat-camera-retake');
        const sendBtn = this.modal.querySelector('#vigichat-camera-send');
        
        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'inline-flex';
        sendBtn.style.display = 'inline-flex';
    }
    
    /**
     * Repetir foto
     */
    retakePhoto() {
        console.log('CameraHandler: Retaking photo...');
        
        // Limpiar foto anterior
        if (this.capturedPhotoBlob) {
            URL.revokeObjectURL(this.previewImg.src);
            this.capturedPhotoBlob = null;
        }
        
        // Mostrar video y ocultar preview
        this.video.style.display = 'block';
        this.preview.style.display = 'none';
        
        // Cambiar botones
        const captureBtn = this.modal.querySelector('#vigichat-camera-capture');
        const retakeBtn = this.modal.querySelector('#vigichat-camera-retake');
        const sendBtn = this.modal.querySelector('#vigichat-camera-send');
        
        captureBtn.style.display = 'inline-flex';
        retakeBtn.style.display = 'none';
        sendBtn.style.display = 'none';
    }
    
    /**
     * Enviar foto capturada
     */
    async sendPhoto() {
        if (!this.capturedPhotoBlob) {
            this.showError('No hay foto para enviar');
            return;
        }
        
        try {
            console.log('CameraHandler: Sending photo...');
            
            // Obtener referencia a la app principal
            const vigiChatApp = window.vigiChatApp;
            
            if (!vigiChatApp || !vigiChatApp.currentConversation) {
                this.showError('Selecciona una conversación primero');
                return;
            }
            
            this.showInfo('Enviando foto...');
            
            // Crear mensaje optimista con imagen
            const optimisticMessage = {
                _id: 'temp_' + Date.now(),
                sender: {
                    _id: vigiChatApp.currentUser.data._id,
                    fullName: vigiChatApp.currentUser.data.fullName,
                    avatar: vigiChatApp.currentUser.data.avatar
                },
                content: { 
                    text: '',
                    image: URL.createObjectURL(this.capturedPhotoBlob),
                    type: 'image'
                },
                type: 'image',
                status: 'sent',
                createdAt: new Date()
            };
            
            // Añadir mensaje a la UI
            if (vigiChatApp.addImageMessageToUI) {
                vigiChatApp.addImageMessageToUI(optimisticMessage);
            }
            
            this.showSuccess('Foto enviada');
            
            // Cerrar modal después de un breve delay
            setTimeout(() => {
                this.closeCamera();
            }, 1000);
            
        } catch (error) {
            console.error('CameraHandler: Error sending photo:', error);
            this.showError('Error enviando foto');
        }
    }
    
    /**
     * Cerrar cámara y limpiar recursos
     */
    closeCamera() {
        console.log('CameraHandler: Closing camera...');
        
        if (this.modal) {
            this.modal.classList.remove('vigichat-show');
            
            setTimeout(() => {
                this.cleanup();
            }, 300);
        } else {
            this.cleanup();
        }
    }
    
    /**
     * Limpiar todos los recursos
     */
    cleanup() {
        console.log('CameraHandler: Cleaning up...');
        
        // Detener stream
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => {
                track.stop();
            });
            this.currentStream = null;
        }
        
        // Limpiar blob
        if (this.capturedPhotoBlob) {
            if (this.previewImg && this.previewImg.src) {
                URL.revokeObjectURL(this.previewImg.src);
            }
            this.capturedPhotoBlob = null;
        }
        
        // Remover modal del DOM
        const existingModal = document.getElementById('vigichat-camera-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Reset variables
        this.modal = null;
        this.video = null;
        this.canvas = null;
        this.preview = null;
        this.previewImg = null;
        this.isInitialized = false;
        
        console.log('CameraHandler: Cleanup completed');
    }
    
    /**
     * Métodos de notificación
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type = 'info') {
        // Usar el sistema de notificaciones de la app principal si existe
        if (window.vigiChatApp && window.vigiChatApp.showNotification) {
            window.vigiChatApp.showNotification(message, type);
        } else {
            // Fallback simple
            console.log(`CameraHandler [${type}]:`, message);
            alert(message);
        }
    }
}

// Crear instancia global
window.vigichatCamera = new CameraHandler();

console.log('CameraHandler module loaded');