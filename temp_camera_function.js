    async openCamera() {
        console.log('📷 Modal Adjuntos: Iniciando openCamera()...');
        
        // Cerrar modal de adjuntos si está abierto
        this.hideAttachmentModal();
        
        // CREAR MODAL SIMPLE PARA CÁMARA CON FUNCIONALIDADES COMPLETAS
        try {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 99999999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const cameraContainer = document.createElement('div');
            cameraContainer.style.cssText = `
                background: #000;
                border-radius: 12px;
                width: 400px;
                height: 500px;
                max-width: 90vw;
                max-height: 90vh;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            `;
            
            cameraContainer.innerHTML = `
                <!-- Top Controls -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 60px;
                    background: linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    padding: 15px 20px 0;
                    z-index: 10;
                ">
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <button class="simple-close-btn" style="
                            background: none; border: none; color: white; font-size: 20px; cursor: pointer;
                            padding: 8px; border-radius: 50%; transition: background 0.2s ease;
                        " title="Cerrar">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="simple-expand-btn" style="
                            background: none; border: none; color: white; font-size: 18px; cursor: pointer;
                            padding: 8px; border-radius: 50%; transition: background 0.2s ease;
                        " title="Expandir">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="simple-flip-btn" style="
                            background: none; border: none; color: white; font-size: 18px; cursor: pointer;
                            padding: 8px; border-radius: 50%; transition: background 0.2s ease;
                        " title="Voltear cámara">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Video Stream -->
                <video id="simple-camera-video" autoplay playsinline muted style="
                    width: 100%; height: 100%; object-fit: cover;
                "></video>
                <canvas id="simple-camera-canvas" style="display: none;"></canvas>
                
                <!-- Bottom Controls -->
                <div style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 100px;
                    background: linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 30px 25px;
                    z-index: 10;
                ">
                    <!-- Botón Galería -->
                    <button class="simple-gallery-btn" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-radius: 12px;
                        width: 50px; height: 50px;
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer; transition: all 0.2s ease;
                    ">
                        <i class="fas fa-images" style="color: white; font-size: 20px;"></i>
                    </button>
                    
                    <!-- Botón Captura -->
                    <button class="simple-capture-btn" style="
                        background: none; border: none; cursor: pointer; padding: 0;
                        display: flex; align-items: center; justify-content: center;
                        width: 80px; height: 80px;
                        border: 6px solid rgba(255, 255, 255, 0.8);
                        border-radius: 50%; position: relative;
                        transition: transform 0.1s ease;
                    ">
                        <div style="
                            width: 50px; height: 50px; background: white; border-radius: 50%;
                            transition: all 0.2s ease;
                        "></div>
                    </button>
                    
                    <!-- Espaciador -->
                    <div style="width: 50px; height: 50px;"></div>
                </div>
                
                <!-- Recording Indicator -->
                <div class="simple-recording-indicator" style="
                    position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
                    display: none; align-items: center; gap: 8px;
                    background: rgba(0, 0, 0, 0.7); padding: 8px 16px; border-radius: 20px;
                    color: white; font-size: 14px; font-weight: 500; z-index: 15;
                ">
                    <div style="
                        width: 8px; height: 8px; background: #ff4444; border-radius: 50%;
                        animation: blink 1s ease-in-out infinite alternate;
                    "></div>
                    <span class="simple-recording-time">00:00</span>
                </div>
            `;
            
            modal.appendChild(cameraContainer);
            document.body.appendChild(modal);
            
            // Referencias a elementos
            const video = modal.querySelector('#simple-camera-video');
            const canvas = modal.querySelector('#simple-camera-canvas');
            const captureBtn = modal.querySelector('.simple-capture-btn');
            const closeBtn = modal.querySelector('.simple-close-btn');
            const expandBtn = modal.querySelector('.simple-expand-btn');
            const flipBtn = modal.querySelector('.simple-flip-btn');
            const galleryBtn = modal.querySelector('.simple-gallery-btn');
            const recordingIndicator = modal.querySelector('.simple-recording-indicator');
            const recordingTime = modal.querySelector('.simple-recording-time');
            
            let currentStream = null;
            let currentFacingMode = 'user';
            let isExpanded = false;
            let isRecording = false;
            let mediaRecorder = null;
            let recordedChunks = [];
            let recordingStartTime = null;
            let recordingTimer = null;
            let pressTimer = null;
            
            console.log('📷 Modal Adjuntos: Solicitando acceso a cámara...');
            
            // Inicializar cámara
            const constraints = {
                video: {
                    facingMode: currentFacingMode,
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 }
                },
                audio: true
            };
            
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
            
            console.log('📷 Modal Adjuntos: Cámara activada exitosamente!');
            
            // EVENTOS
            
            // Cerrar modal
            const closeModal = () => {
                if (mediaRecorder && isRecording) {
                    mediaRecorder.stop();
                }
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
                modal.remove();
                console.log('📷 Modal Adjuntos: Cámara cerrada');
            };
            
            closeBtn.onclick = closeModal;
            
            // Expandir/contraer
            expandBtn.onclick = () => {
                if (!isExpanded) {
                    cameraContainer.style.width = '95vw';
                    cameraContainer.style.height = '95vh';
                    expandBtn.innerHTML = '<i class="fas fa-compress"></i>';
                    expandBtn.title = 'Contraer';
                    isExpanded = true;
                } else {
                    cameraContainer.style.width = '400px';
                    cameraContainer.style.height = '500px';
                    expandBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    expandBtn.title = 'Expandir';
                    isExpanded = false;
                }
            };
            
            // Voltear cámara
            flipBtn.onclick = async () => {
                try {
                    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                    
                    if (currentStream) {
                        currentStream.getTracks().forEach(track => track.stop());
                    }
                    
                    const newConstraints = {
                        video: {
                            facingMode: currentFacingMode,
                            width: { ideal: 1280, min: 640 },
                            height: { ideal: 720, min: 480 }
                        },
                        audio: true
                    };
                    
                    currentStream = await navigator.mediaDevices.getUserMedia(newConstraints);
                    video.srcObject = currentStream;
                    
                } catch (error) {
                    console.error('Error cambiando cámara:', error);
                }
            };
            
            // Botón galería
            galleryBtn.onclick = () => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                
                fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const imageUrl = URL.createObjectURL(file);
                        this.addCapturedPhotoToChat(imageUrl, file);
                        closeModal();
                    }
                };
                
                document.body.appendChild(fileInput);
                fileInput.click();
                document.body.removeChild(fileInput);
            };
            
            // Función para actualizar tiempo de grabación
            const updateRecordingTime = () => {
                if (recordingStartTime) {
                    const elapsed = Date.now() - recordingStartTime;
                    const seconds = Math.floor(elapsed / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
                }
            };
            
            // BOTÓN CAPTURA CON PRESS AND HOLD
            captureBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                pressTimer = setTimeout(() => {
                    startVideoRecording();
                }, 500);
            });
            
            captureBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                if (isRecording) {
                    stopVideoRecording();
                } else {
                    takePhoto();
                }
            });
            
            captureBtn.addEventListener('mouseleave', (e) => {
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                if (isRecording) {
                    stopVideoRecording();
                }
            });
            
            // Touch events
            captureBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                pressTimer = setTimeout(() => {
                    startVideoRecording();
                }, 500);
            });
            
            captureBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                if (isRecording) {
                    stopVideoRecording();
                } else {
                    takePhoto();
                }
            });
            
            // Funciones
            const startVideoRecording = () => {
                try {
                    recordedChunks = [];
                    mediaRecorder = new MediaRecorder(currentStream);
                    
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            recordedChunks.push(event.data);
                        }
                    };
                    
                    mediaRecorder.onstop = () => {
                        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                        showVideoPreview(videoBlob);
                    };
                    
                    mediaRecorder.start();
                    isRecording = true;
                    recordingStartTime = Date.now();
                    
                    recordingIndicator.style.display = 'flex';
                    captureBtn.style.borderColor = '#ff4444';
                    const innerCircle = captureBtn.querySelector('div');
                    innerCircle.style.background = '#ff4444';
                    innerCircle.style.borderRadius = '12px';
                    innerCircle.style.transform = 'scale(0.6)';
                    
                    recordingTimer = setInterval(updateRecordingTime, 1000);
                    console.log('🎥 Iniciando grabación...');
                } catch (error) {
                    console.error('Error grabación:', error);
                }
            };
            
            const stopVideoRecording = () => {
                if (mediaRecorder && isRecording) {
                    mediaRecorder.stop();
                    isRecording = false;
                    recordingStartTime = null;
                    
                    recordingIndicator.style.display = 'none';
                    captureBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                    const innerCircle = captureBtn.querySelector('div');
                    innerCircle.style.background = 'white';
                    innerCircle.style.borderRadius = '50%';
                    innerCircle.style.transform = 'scale(1)';
                    
                    if (recordingTimer) {
                        clearInterval(recordingTimer);
                        recordingTimer = null;
                    }
                    console.log('🎥 Grabación detenida');
                }
            };
            
            const takePhoto = () => {
                console.log('📷 Tomando foto...');
                
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const imageUrl = URL.createObjectURL(blob);
                        this.addCapturedPhotoToChat(imageUrl, blob);
                        closeModal();
                        console.log('📷 Foto capturada y enviada');
                    }
                }, 'image/jpeg', 0.9);
            };
            
            const showVideoPreview = (videoBlob) => {
                closeModal();
                
                const previewModal = document.createElement('div');
                previewModal.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.9); z-index: 10002;
                    display: flex; align-items: center; justify-content: center;
                `;
                
                const videoUrl = URL.createObjectURL(videoBlob);
                
                previewModal.innerHTML = `
                    <div style="background: white; border-radius: 12px; padding: 20px; max-width: 400px; width: 90%; text-align: center;">
                        <h3 style="margin: 0 0 15px 0; color: #333;">Video capturado</h3>
                        <video src="${videoUrl}" controls style="width: 100%; max-width: 300px; border-radius: 8px; margin-bottom: 15px;"></video>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button id="cancel-video" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button id="add-to-input" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-plus"></i> Añadir al mensaje
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(previewModal);
                
                previewModal.querySelector('#cancel-video').onclick = () => {
                    URL.revokeObjectURL(videoUrl);
                    previewModal.remove();
                };
                
                previewModal.querySelector('#add-to-input').onclick = () => {
                    this.addVideoToInput(videoBlob, videoUrl);
                    previewModal.remove();
                };
            };
            
        } catch (error) {
            console.error('📷 Modal Adjuntos Error: ' + error.message);
            
            let errorMessage = 'No se pudo acceder a la cámara.';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Permisos de cámara denegados. Permite el acceso a la cámara.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No se encontró una cámara en este dispositivo.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'La cámara no es compatible con este navegador.';
            }
            
            Utils.Notifications.error(errorMessage);
        }
    }