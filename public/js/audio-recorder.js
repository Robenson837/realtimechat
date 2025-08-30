/**
 * Audio Recorder - Sistema de grabación y envío de mensajes de voz
 * Funcionalidad de intercambio dinámico entre micrófono y botón enviar
 */

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.stream = null;
        this.audioContext = null;
        this.analyser = null;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.pausedDuration = 0;
        this.recordedFrequencies = []; // Guardar frecuencias reales grabadas
        this.visualizationFrame = null;
        
        // Referencias DOM
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.recordBtn = document.getElementById('record-btn');
        this.stopRecordBtn = document.getElementById('stop-record-btn');
        this.recordingIndicator = document.getElementById('recording-indicator');
        
        // Nuevas referencias DOM para interfaz mejorada
        this.recordingInterface = document.getElementById('recording-interface');
        this.audioPreviewInterface = document.getElementById('audio-preview-interface');
        this.inputArea = document.querySelector('.input-area');
        this.deleteRecordingBtn = document.getElementById('delete-recording-btn');
        this.pauseRecordBtn = document.getElementById('pause-record-btn');
        this.resumeRecordBtn = document.getElementById('resume-record-btn');
        this.finishRecordBtn = document.getElementById('finish-record-btn');
        this.recordingTimerEl = document.getElementById('recording-timer');
        this.audioVisualizer = document.getElementById('audio-visualizer');
        this.frequencyBars = document.querySelectorAll('.frequency-bar');
        
        // Referencias DOM para preview
        this.deletePreviewBtn = document.getElementById('delete-preview-btn');
        this.previewPlayBtn = document.getElementById('preview-play-btn');
        this.previewWaveform = document.getElementById('audio-preview-waveform');
        this.previewDurationEl = document.getElementById('preview-duration');
        this.recordAgainBtn = document.getElementById('record-again-btn');
        this.sendVoiceBtn = document.getElementById('send-voice-btn');
        this.previewAudio = document.getElementById('preview-audio');
        this.previewProgressOverlay = document.getElementById('preview-progress-overlay');
        
        // Estado del flujo
        this.currentState = 'idle'; // idle, recording, preview, sending
        this.recordedAudioBlob = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkInputContent();
    }

    setupEventListeners() {
        // Detectar cambios en el input de texto
        if (this.messageInput) {
            this.messageInput.addEventListener('input', () => this.checkInputContent());
            this.messageInput.addEventListener('paste', () => setTimeout(() => this.checkInputContent(), 10));
            this.messageInput.addEventListener('keyup', () => this.checkInputContent());
        }

        // Botón de grabación
        if (this.recordBtn) {
            this.recordBtn.addEventListener('click', () => this.startRecording());
        }

        // Botón de detener grabación (legacy)
        if (this.stopRecordBtn) {
            this.stopRecordBtn.addEventListener('click', () => this.stopRecording());
        }

        // Nuevos botones de la interfaz mejorada
        if (this.deleteRecordingBtn) {
            this.deleteRecordingBtn.addEventListener('click', () => this.deleteRecording());
        }

        if (this.pauseRecordBtn) {
            this.pauseRecordBtn.addEventListener('click', () => this.pauseRecording());
        }

        if (this.resumeRecordBtn) {
            this.resumeRecordBtn.addEventListener('click', () => this.resumeRecording());
        }

        if (this.finishRecordBtn) {
            this.finishRecordBtn.addEventListener('click', () => this.finishRecording());
        }

        // Event listeners para preview
        if (this.deletePreviewBtn) {
            this.deletePreviewBtn.addEventListener('click', () => this.deletePreview());
        }

        if (this.previewPlayBtn) {
            this.previewPlayBtn.addEventListener('click', () => this.togglePreviewPlayback());
        }

        if (this.recordAgainBtn) {
            this.recordAgainBtn.addEventListener('click', () => this.recordAgain());
        }

        if (this.sendVoiceBtn) {
            this.sendVoiceBtn.addEventListener('click', () => this.sendVoiceMessage());
        }
    }

    checkInputContent() {
        if (!this.messageInput || !this.sendBtn || !this.recordBtn) return;

        const hasText = this.messageInput.textContent.trim().length > 0;
        
        if (hasText && !this.isRecording) {
            // Mostrar botón enviar, ocultar micrófono
            this.sendBtn.classList.remove('hidden');
            this.recordBtn.classList.add('hidden');
            this.sendBtn.disabled = false;
        } else if (!hasText && !this.isRecording) {
            // Mostrar micrófono, ocultar botón enviar
            this.sendBtn.classList.add('hidden');
            this.recordBtn.classList.remove('hidden');
            this.sendBtn.disabled = true;
        }
    }

    async startRecording() {
        try {
            // Solicitar permisos de micrófono
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            // Configurar AudioContext para análisis de frecuencia
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            const source = this.audioContext.createMediaStreamSource(this.stream);
            source.connect(this.analyser);
            
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            // Configurar MediaRecorder con compresión optimizada
            const preferredMimeTypes = [
                'audio/webm;codecs=opus',
                'audio/ogg;codecs=opus',
                'audio/mp4;codecs=mp4a.40.2', // AAC
                'audio/webm',
                'audio/mp4'
            ];
            
            let selectedMimeType = 'audio/webm'; // Fallback
            for (const mimeType of preferredMimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: selectedMimeType,
                audioBitsPerSecond: 64000 // 64kbps para buena calidad y tamaño reducido
            });

            this.audioChunks = [];
            
            // Event listeners del MediaRecorder
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                // Procesar grabación y mostrar preview
                this.processRecording();
            };

            // Iniciar grabación
            this.mediaRecorder.start();
            this.isRecording = true;
            this.isPaused = false;
            this.recordingStartTime = Date.now();
            this.pausedDuration = 0;
            this.recordedFrequencies = []; // Reiniciar frecuencias grabadas
            
            // Actualizar UI
            this.showRecordingInterface();
            this.startTimer();
            this.startVisualization();
            
            // Mostrar notificación
            this.showNotification('info', 'Grabando mensaje de voz...');

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showNotification('error', 'No se pudo acceder al micrófono');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Detener stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            // Actualizar UI
            this.updateRecordingUI(false);
        }
    }

    updateRecordingUI(recording) {
        if (!this.recordBtn || !this.stopRecordBtn || !this.sendBtn) return;

        if (recording) {
            // Durante grabación: mostrar botón stop
            this.recordBtn.classList.add('hidden');
            this.stopRecordBtn.classList.remove('hidden');
            this.sendBtn.classList.add('hidden');
            
            // Agregar clase de grabación para efectos visuales
            this.stopRecordBtn.classList.add('recording');
            document.body.classList.add('recording');
            
            // Mostrar indicador de grabación
            if (this.recordingIndicator) {
                this.recordingIndicator.classList.remove('hidden');
            }
            
        } else {
            // Después de grabación: mostrar botón enviar
            this.recordBtn.classList.add('hidden');
            this.stopRecordBtn.classList.add('hidden');
            this.sendBtn.classList.remove('hidden');
            this.sendBtn.disabled = false;
            
            // Remover clase de grabación
            this.stopRecordBtn.classList.remove('recording');
            document.body.classList.remove('recording');
            
            // Ocultar indicador de grabación
            if (this.recordingIndicator) {
                this.recordingIndicator.classList.add('hidden');
            }
        }
    }

    async processRecording() {
        // Detener stream y timers
        this.stopTimer();
        this.stopVisualization();
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }

        if (this.audioChunks.length === 0) {
            this.showNotification('error', 'No se grabó audio');
            this.resetToIdle();
            return;
        }

        // Crear blob de audio
        const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder.mimeType || 'audio/webm' 
        });

        // Validar duración mínima (500ms)
        if (audioBlob.size < 1000) {
            this.showNotification('error', 'La grabación es demasiado corta');
            this.resetToIdle();
            return;
        }

        try {
            // Guardar blob para preview y envío posterior
            this.recordedAudioBlob = audioBlob;
            
            // Mostrar interfaz de preview
            this.showPreviewInterface();
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.showNotification('error', 'Error al procesar la grabación');
            this.resetToIdle();
        }
    }

    showSendingState() {
        // Cambiar interfaz para mostrar que se está enviando
        if (this.deleteRecordingBtn) this.deleteRecordingBtn.style.display = 'none';
        if (this.pauseRecordBtn) this.pauseRecordBtn.style.display = 'none';
        if (this.finishRecordBtn) {
            this.finishRecordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            this.finishRecordBtn.disabled = true;
        }
        if (this.recordingTimerEl) {
            const elapsed = Date.now() - this.recordingStartTime - this.pausedDuration;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.recordingTimerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    async sendAudioMessage(audioBlob) {
        // Obtener la duración real del archivo de audio
        const realDuration = await this.getAudioRealDuration(audioBlob);
        
        // Crear FormData para envío
        const formData = new FormData();
        formData.append('audio', audioBlob, `voice_message_${Date.now()}.webm`);
        formData.append('type', 'audio');
        
        // Agregar duración real del archivo
        formData.append('duration', realDuration);
        
        // Agregar frecuencias para mostrar en el mensaje
        if (this.recordedFrequencies.length > 0) {
            formData.append('frequencies', JSON.stringify(this.getAverageFrequencies()));
        }
        
        // Obtener conversación activa
        const activeConversation = this.getActiveConversation();
        if (!activeConversation) {
            throw new Error('No hay conversación activa');
        }
        
        formData.append('conversationId', activeConversation);

        // Crear ID temporal fuera del try para que esté disponible en el catch
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        
        try {
            // Crear mensaje temporal para mostrar inmediatamente en la conversación
            const tempMessage = {
                _id: tempId,
                type: 'voice',
                content: {
                    fileUrl: URL.createObjectURL(audioBlob), // URL temporal para preview
                    fileName: `voice_message_${Date.now()}.webm`,
                    fileSize: audioBlob.size,
                    duration: realDuration,
                    frequencies: this.recordedFrequencies.length > 0 ? this.getAverageFrequencies() : []
                },
                sender: window.currentUser || { _id: 'temp_user', fullName: 'Tú' },
                createdAt: new Date().toISOString(),
                status: 'sending',
                // Asegurar que se procese como mensaje enviado
                isSent: true,
                isReceived: false
            };
            
            // Agregar mensaje inmediatamente a la conversación usando el ChatManager
            if (window.chatManager) {
                // Usar renderMessage que maneja automáticamente el appendChild y scroll
                const messageEl = window.chatManager.renderMessage(tempMessage, false);
                
                // Agregar clases y atributos para el estado temporal
                if (messageEl) {
                    messageEl.classList.add("sending");
                    messageEl.dataset.messageId = tempId;
                    messageEl.dataset.clientId = tempId;
                    messageEl.setAttribute("data-client-id", tempId);
                    
                    console.log('Audio message rendered and added to chat:', tempId);
                }
            }
            
            // Usar el sistema API existente
            if (typeof API !== 'undefined' && API.Messages) {
                const response = await API.Messages.sendFile(formData);
                
                if (response.success) {
                    this.showNotification('success', 'Mensaje de voz enviado');
                    
                    // Actualizar el mensaje temporal con los datos reales del servidor
                    if (response.message && window.chatManager) {
                        const messageEl = document.querySelector(`[data-client-id="${tempId}"]`);
                        if (messageEl) {
                            messageEl.classList.remove("sending");
                            messageEl.classList.add("sent");
                            messageEl.dataset.messageId = response.message._id;
                        }
                    }
                    
                    // Restaurar UI normal - ocultar preview y volver al estado inicial
                    this.hidePreviewInterface();
                    this.resetToIdle();
                    
                    setTimeout(() => {
                        this.checkInputContent();
                    }, 100);
                    
                } else {
                    // Si hay error, remover el mensaje temporal
                    const messageEl = document.querySelector(`[data-client-id="${tempId}"]`);
                    if (messageEl) {
                        messageEl.remove();
                    }
                    throw new Error(response.message || 'Error al enviar mensaje de voz');
                }
            } else {
                // Si no hay API, remover mensaje temporal
                const messageEl = document.querySelector(`[data-client-id="${tempId}"]`);
                if (messageEl) {
                    messageEl.remove();
                }
                throw new Error('Sistema de API no disponible');
            }
            
        } catch (error) {
            console.error('Error in sendAudioMessage:', error);
            // Asegurar que se remueva el mensaje temporal en caso de error
            const messageEl = document.querySelector(`[data-client-id="${tempId}"]`);
            if (messageEl) {
                messageEl.remove();
            }
            throw error;
        }
    }

    getActiveConversation() {
        // Obtener conversación activa desde el ChatManager
        if (window.chatManager && window.chatManager.currentConversation) {
            return window.chatManager.currentConversation._id;
        }
        
        // Fallback: buscar en el DOM
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader && chatHeader.dataset.conversationId) {
            return chatHeader.dataset.conversationId;
        }
        
        // Fallback: buscar conversación activa por clase en sidebar
        const activeChat = document.querySelector('.chat-item.active');
        if (activeChat && activeChat.dataset.conversationId) {
            return activeChat.dataset.conversationId;
        }
        
        return null;
    }

    getRecordingDuration() {
        if (!this.recordingStartTime) return '0:00';
        
        const elapsed = (Date.now() - this.recordingStartTime - this.pausedDuration) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Obtener la duración real del archivo de audio
    async getAudioRealDuration(audioBlob) {
        return new Promise((resolve) => {
            const tempAudio = document.createElement('audio');
            
            // Crear URL temporal para el blob
            const blobUrl = URL.createObjectURL(audioBlob);
            tempAudio.src = blobUrl;
            
            tempAudio.addEventListener('loadedmetadata', () => {
                // Obtener duración real del archivo
                const duration = tempAudio.duration;
                
                // Limpiar URL temporal
                URL.revokeObjectURL(blobUrl);
                
                if (isFinite(duration)) {
                    const minutes = Math.floor(duration / 60);
                    const seconds = Math.floor(duration % 60);
                    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    console.log(`Duración real del audio: ${formattedDuration} (${duration} segundos)`);
                    resolve(formattedDuration);
                } else {
                    // Fallback a duración calculada
                    console.warn('No se pudo obtener la duración real del audio, usando duración calculada');
                    resolve(this.getRecordingDuration());
                }
            });

            tempAudio.addEventListener('error', () => {
                console.error('Error al cargar el audio para obtener duración');
                URL.revokeObjectURL(blobUrl);
                // Fallback a duración calculada
                resolve(this.getRecordingDuration());
            });

            // Timeout por si no se carga
            setTimeout(() => {
                if (tempAudio.readyState === 0) {
                    console.warn('Timeout al cargar audio, usando duración calculada');
                    URL.revokeObjectURL(blobUrl);
                    resolve(this.getRecordingDuration());
                }
            }, 5000);
        });
    }

    // Helper para convertir blob a data URL (compatible con CSP)
    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    getAverageFrequencies() {
        if (!this.recordedFrequencies.length) return [];
        
        const barCount = 10; // Cantidad de barras que queremos
        const averageFreqs = new Array(barCount).fill(0);
        
        // Calcular promedio de todas las capturas
        this.recordedFrequencies.forEach(snapshot => {
            snapshot.forEach((freq, index) => {
                if (index < barCount) {
                    averageFreqs[index] += freq;
                }
            });
        });
        
        // Obtener promedio final
        return averageFreqs.map(sum => Math.round(sum / this.recordedFrequencies.length));
    }

    // Métodos para controles de preview
    // Método obsoleto eliminado - usar solo la versión actualizada más abajo

    updatePreviewProgress() {
        if (!this.previewAudio || !this.previewProgressOverlay) return;
        
        const progress = (this.previewAudio.currentTime / this.previewAudio.duration) * 100;
        this.previewProgressOverlay.style.width = `${progress}%`;
    }

    onPreviewEnded() {
        if (this.previewPlayBtn) {
            this.previewPlayBtn.querySelector('i').className = 'fas fa-play';
        }
        if (this.previewProgressOverlay) {
            this.previewProgressOverlay.style.width = '0%';
        }
    }

    deletePreview() {
        // Limpiar URLs de blob antes de resetear
        const audio = document.getElementById('audio-preview-element');
        if (audio && audio.dataset.blobUrl) {
            URL.revokeObjectURL(audio.dataset.blobUrl);
        }
        
        // Limpiar blob
        if (this.recordedAudioBlob) {
            this.recordedAudioBlob = null;
        }
        
        this.resetToIdle();
        this.showNotification('info', 'Grabación eliminada');
    }

    recordAgain() {
        // Limpiar preview actual
        if (this.previewAudio && this.previewAudio.src) {
            URL.revokeObjectURL(this.previewAudio.src);
        }
        
        // Limpiar datos y volver a grabar
        this.audioChunks = [];
        this.recordedFrequencies = [];
        this.recordedAudioBlob = null;
        
        // Ocultar preview y comenzar nueva grabación
        this.hidePreviewInterface();
        this.startRecording();
    }

    async sendVoiceMessage() {
        if (!this.recordedAudioBlob) return;
        
        this.currentState = 'sending';
        
        // Mostrar estado de envío en botón de preview
        const audioInterface = document.getElementById('audio-preview-interface');
        const previewSendBtn = audioInterface?.querySelector('.preview-send-btn');
        if (previewSendBtn) {
            previewSendBtn.disabled = true;
            previewSendBtn.querySelector('i').className = 'fas fa-spinner fa-spin';
        }

        try {
            // Limpiar URLs de blob de preview antes de enviar
            const audio = document.getElementById('audio-preview-element');
            if (audio && audio.dataset.blobUrl) {
                URL.revokeObjectURL(audio.dataset.blobUrl);
            }
            
            // Enviar audio usando el método existente
            await this.sendAudioMessage(this.recordedAudioBlob);
            
            this.showNotification('success', 'Mensaje de voz enviado');
            
            // Limpiar y resetear
            setTimeout(() => {
                this.resetToIdle();
            }, 500);
            
        } catch (error) {
            console.error('Error sending voice message:', error);
            this.showNotification('error', 'Error al enviar el mensaje de voz');
            
            // Resetear botón
            if (previewSendBtn) {
                previewSendBtn.disabled = false;
                previewSendBtn.querySelector('i').className = 'fas fa-paper-plane';
            }
        }
    }

    showNotification(type, message) {
        if (typeof Utils !== 'undefined' && Utils.showNotification) {
            Utils.showNotification(type, message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Método para cancelar grabación (ESC key, etc.)
    cancelRecording() {
        if (this.isRecording) {
            this.stopRecording();
            this.audioChunks = [];
            this.showNotification('info', 'Grabación cancelada');
            this.checkInputContent();
        }
    }

    // Nuevos métodos para la interfaz mejorada

    showRecordingInterface() {
        if (this.inputArea && this.recordingInterface) {
            this.inputArea.classList.add('hidden');
            this.recordingInterface.classList.remove('hidden');
        }
    }

    hideRecordingInterface() {
        if (this.recordingInterface) {
            this.recordingInterface.classList.add('hidden');
        }
    }

    showPreviewInterface() {
        this.currentState = 'preview';
        
        // Ocultar interfaz de grabación
        this.hideRecordingInterface();
        
        // Crear y mostrar interfaz de preview
        this.showStylePreview();
    }

    showStylePreview() {
        // Ocultar input area original
        if (this.inputArea) {
            this.inputArea.classList.add('hidden');
        }
        
        // Crear interfaz de preview
        this.createPreviewInterface();
    }

    createPreviewInterface() {
        // Remover interfaz existente si existe
        const existingInterface = document.getElementById('audio-preview-interface');
        if (existingInterface) {
            existingInterface.remove();
        }

        // Crear container principal con diseño WhatsApp
        const previewContainer = document.createElement('div');
        previewContainer.id = 'audio-preview-interface';
        previewContainer.className = 'audio-preview-container-whatsapp';

        // Botón eliminar (izquierda)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'preview-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Eliminar grabación';
        deleteBtn.onclick = () => this.deletePreview();

        // Crear el componente de audio estilo WhatsApp completo
        const audioWhatsApp = document.createElement('div');
        audioWhatsApp.className = 'audio-preview-whatsapp-complete';
        
        // Botón play
        const playBtn = document.createElement('button');
        playBtn.className = 'audio-play-btn-complete-preview';
        playBtn.onclick = () => this.togglePreviewPlayback();
        
        // Crear triángulo de play
        const playTriangle = document.createElement('span');
        playTriangle.className = 'play-triangle-preview';
        playBtn.appendChild(playTriangle);
        
        // Contenedor de progreso completo
        const progressContainer = document.createElement('div');
        progressContainer.className = 'audio-progress-container-complete-preview';
        
        // Tiempo actual
        const currentTime = document.createElement('span');
        currentTime.className = 'audio-current-time-preview';
        currentTime.id = 'preview-current-time';
        currentTime.textContent = '0:00';
        
        // Contenedor de barras de frecuencia
        const waveformContainer = document.createElement('div');
        waveformContainer.className = 'audio-waveform-container-preview';
        waveformContainer.onclick = (e) => this.seekPreviewByClick(e);
        
        // Barras de frecuencia
        const frequencyBars = document.createElement('div');
        frequencyBars.className = 'audio-frequency-bars-preview';
        frequencyBars.id = 'preview-frequency-bars';
        frequencyBars.innerHTML = this.generatePreviewFrequencyBars();
        
        // Overlay de progreso
        const progressOverlay = document.createElement('div');
        progressOverlay.className = 'audio-progress-overlay-preview';
        progressOverlay.id = 'preview-progress-overlay';
        
        waveformContainer.appendChild(frequencyBars);
        waveformContainer.appendChild(progressOverlay);
        
        // Duración total - inicialmente usar duración calculada, luego actualizar con exacta
        const totalTime = document.createElement('span');
        totalTime.className = 'audio-total-time-preview';
        totalTime.id = 'preview-total-time';
        totalTime.textContent = this.formatDuration(this.getRecordingDuration());
        
        progressContainer.appendChild(currentTime);
        progressContainer.appendChild(waveformContainer);
        progressContainer.appendChild(totalTime);
        
        audioWhatsApp.appendChild(playBtn);
        audioWhatsApp.appendChild(progressContainer);

        // Audio oculto para preview
        const audioElement = document.createElement('audio');
        audioElement.id = 'audio-preview-element';
        audioElement.style.display = 'none';
        audioElement.preload = 'metadata';
        audioElement.controls = false;
        
        // Configurar blob como source usando data URL (compatible con CSP)
        if (this.recordedAudioBlob) {
            this.blobToDataURL(this.recordedAudioBlob).then(dataUrl => {
                audioElement.src = dataUrl;
                
                // Una vez que se carga el audio, obtener la duración real
                audioElement.addEventListener('loadedmetadata', () => {
                    if (audioElement.duration && isFinite(audioElement.duration)) {
                        const minutes = Math.floor(audioElement.duration / 60);
                        const seconds = Math.floor(audioElement.duration % 60);
                        const realDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        
                        // Actualizar la duración mostrada
                        const totalTimeEl = document.getElementById('preview-total-time');
                        if (totalTimeEl) {
                            totalTimeEl.textContent = realDuration;
                        }
                        
                        console.log(`Duración real del audio: ${realDuration}`);
                    }
                });
            }).catch(error => {
                console.error('Error converting audio blob to data URL:', error);
            });
        }

        audioWhatsApp.appendChild(audioElement);

        // Botón enviar (derecha)
        const sendBtn = document.createElement('button');
        sendBtn.className = 'preview-send-btn';
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendBtn.title = 'Enviar mensaje de voz';
        sendBtn.onclick = () => this.sendVoiceMessage();

        // Ensamblar interfaz con nuevo diseño
        previewContainer.appendChild(deleteBtn);
        previewContainer.appendChild(audioWhatsApp);
        previewContainer.appendChild(sendBtn);

        // Agregar al DOM (reemplazar input area)
        const messageContainer = document.getElementById('message-input-container');
        if (messageContainer && this.inputArea) {
            this.inputArea.after(previewContainer);
        }
    }

    showSimplePreviewButtons() {
        // Ocultar botones originales
        if (this.recordBtn) {
            this.recordBtn.classList.add('hidden');
        }
        if (this.sendBtn) {
            this.sendBtn.classList.add('hidden');
        }
        
        // Crear botones de preview
        this.createPreviewButtons();
    }

    createPreviewButtons() {
        // Remover botones existentes si existen
        const existingDeleteBtn = document.getElementById('temp-delete-btn');
        const existingSendBtn = document.getElementById('temp-send-btn');
        if (existingDeleteBtn) existingDeleteBtn.remove();
        if (existingSendBtn) existingSendBtn.remove();
        
        // Crear botón eliminar (izquierda)
        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'temp-delete-btn';
        deleteBtn.className = 'send-btn'; // Misma clase para estilo transparente
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Eliminar grabación';
        deleteBtn.onclick = () => this.deletePreview();
        
        // Crear botón enviar (derecha)
        const sendBtn = document.createElement('button');
        sendBtn.id = 'temp-send-btn';
        sendBtn.className = 'send-btn'; // Misma clase para estilo transparente
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendBtn.title = 'Enviar mensaje de voz';
        sendBtn.onclick = () => this.sendVoiceMessage();
        
        // Agregar al input area: eliminar al inicio, enviar al final
        if (this.inputArea) {
            // Eliminar a la izquierda (después del botón adjuntar si existe)
            const attachBtn = this.inputArea.querySelector('.attach-btn');
            if (attachBtn) {
                attachBtn.after(deleteBtn);
            } else {
                this.inputArea.prepend(deleteBtn);
            }
            
            // Enviar a la derecha (al final)
            this.inputArea.appendChild(sendBtn);
        }
    }

    hidePreviewInterface() {
        if (this.audioPreviewInterface) {
            this.audioPreviewInterface.classList.add('hidden');
        }
    }

    setupPreviewAudio() {
        if (this.previewAudio && this.recordedAudioBlob) {
            this.blobToDataURL(this.recordedAudioBlob).then(dataUrl => {
                this.previewAudio.src = dataUrl;
                
                // Event listeners para el progreso
                this.previewAudio.ontimeupdate = () => this.updatePreviewProgress();
                this.previewAudio.onended = () => this.onPreviewEnded();
            }).catch(error => {
                console.error('Error converting audio blob to data URL in preview:', error);
            });
        }
    }

    renderPreviewFrequencies() {
        const container = document.querySelector('.preview-frequency-bars');
        if (!container || !this.recordedFrequencies.length) return;
        
        // Limpiar barras existentes
        container.innerHTML = '';
        
        // Crear barras con frecuencias reales
        const averageFreqs = this.getAverageFrequencies();
        averageFreqs.forEach(freq => {
            const height = Math.max(4, Math.min(28, (freq / 255) * 24 + 4));
            const bar = document.createElement('div');
            bar.className = 'preview-frequency-bar';
            bar.style.height = `${height}px`;
            container.appendChild(bar);
        });
    }

    resetToIdle() {
        this.currentState = 'idle';
        
        // Limpiar estados
        this.isRecording = false;
        this.isPaused = false;
        this.audioChunks = [];
        this.recordedFrequencies = [];
        this.recordedAudioBlob = null;
        
        // Limpiar timers
        this.stopTimer();
        this.stopVisualization();
        
        // Remover interfaz de audio y limpiar URLs de blob
        const audioInterface = document.getElementById('audio-preview-interface');
        if (audioInterface) {
            // Limpiar URLs de blob antes de remover
            const audio = audioInterface.querySelector('#audio-preview-element');
            if (audio && audio.dataset.blobUrl) {
                URL.revokeObjectURL(audio.dataset.blobUrl);
            }
            audioInterface.remove();
        }

        // Remover botones temporales
        const tempSendBtn = document.getElementById('temp-send-btn');
        const tempDeleteBtn = document.getElementById('temp-delete-btn');
        if (tempSendBtn) tempSendBtn.remove();
        if (tempDeleteBtn) tempDeleteBtn.remove();
        
        // Restaurar botón enviar original
        if (this.sendBtn) {
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            this.sendBtn.onclick = null;
            this.sendBtn.title = 'Enviar mensaje';
        }
        
        // Mostrar botón de grabar
        if (this.recordBtn) {
            this.recordBtn.classList.remove('hidden');
        }
        
        // Ocultar todas las interfaces
        this.hideRecordingInterface();
        this.hidePreviewInterface();
        
        // Mostrar input normal
        if (this.inputArea) {
            this.inputArea.classList.remove('hidden');
            this.checkInputContent();
        }
    }

    startTimer() {
        this.recordingTimer = setInterval(() => {
            if (!this.isPaused) {
                const elapsed = Date.now() - this.recordingStartTime - this.pausedDuration;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                if (this.recordingTimerEl) {
                    this.recordingTimerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }, 100);
    }

    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    startVisualization() {
        if (!this.analyser || !this.frequencyBars.length) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateBars = () => {
            if (!this.isRecording) {
                if (this.visualizationFrame) {
                    cancelAnimationFrame(this.visualizationFrame);
                    this.visualizationFrame = null;
                }
                return;
            }

            if (this.isPaused) {
                // Durante pausa, mantener las últimas frecuencias pero sin animación
                this.visualizationFrame = requestAnimationFrame(updateBars);
                return;
            }

            this.analyser.getByteFrequencyData(dataArray);

            // Calcular valores para cada barra (dividir el espectro en 10 partes)
            const barCount = this.frequencyBars.length;
            const step = Math.floor(bufferLength / barCount);
            const currentFrequencies = [];

            this.frequencyBars.forEach((bar, index) => {
                const startIndex = index * step;
                const endIndex = startIndex + step;
                
                // Calcular promedio de frecuencias para esta barra
                let sum = 0;
                for (let i = startIndex; i < endIndex && i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / step;
                
                // Guardar frecuencia real para persistencia después de grabar
                currentFrequencies.push(average);
                
                // Convertir a altura (4px mínimo, 32px máximo)
                const height = Math.max(4, (average / 255) * 28 + 4);
                bar.style.height = `${height}px`;
                
                // Agregar clase activa si hay sonido
                if (average > 10) {
                    bar.classList.add('active');
                } else {
                    bar.classList.remove('active');
                }
            });

            // Guardar snapshot de frecuencias cada 100ms para crear patrón final
            if (!this.lastFrequencySnapshot || Date.now() - this.lastFrequencySnapshot > 100) {
                this.recordedFrequencies.push([...currentFrequencies]);
                this.lastFrequencySnapshot = Date.now();
            }

            this.visualizationFrame = requestAnimationFrame(updateBars);
        };

        updateBars();
    }

    stopVisualization() {
        if (this.visualizationFrame) {
            cancelAnimationFrame(this.visualizationFrame);
            this.visualizationFrame = null;
        }
    }

    // Crear patrón de frecuencias para mostrar después de grabar
    createFrequencyPattern() {
        if (!this.recordedFrequencies.length || !this.frequencyBars.length) return;

        // Crear un patrón representativo del audio grabado
        const barCount = this.frequencyBars.length;
        const totalSnapshots = this.recordedFrequencies.length;
        
        // Calcular promedios por barra durante toda la grabación
        const averageFrequencies = new Array(barCount).fill(0);
        
        this.recordedFrequencies.forEach(snapshot => {
            snapshot.forEach((freq, index) => {
                if (index < barCount) {
                    averageFrequencies[index] += freq;
                }
            });
        });

        // Aplicar patrón final a las barras
        this.frequencyBars.forEach((bar, index) => {
            const avgFreq = averageFrequencies[index] / totalSnapshots;
            const height = Math.max(6, (avgFreq / 255) * 24 + 6);
            
            bar.style.height = `${height}px`;
            bar.classList.remove('active');
            bar.classList.add('recorded'); // Clase para barras de audio grabado
        });
    }

    pauseRecording() {
        if (this.mediaRecorder && this.isRecording && !this.isPaused) {
            this.mediaRecorder.pause();
            this.isPaused = true;
            this.pauseStartTime = Date.now();
            
            // Actualizar UI
            if (this.pauseRecordBtn && this.resumeRecordBtn) {
                this.pauseRecordBtn.classList.add('hidden');
                this.resumeRecordBtn.classList.remove('hidden');
            }
            
            this.showNotification('info', 'Grabación pausada');
        }
    }

    resumeRecording() {
        if (this.mediaRecorder && this.isRecording && this.isPaused) {
            this.mediaRecorder.resume();
            this.isPaused = false;
            this.pausedDuration += Date.now() - this.pauseStartTime;
            
            // Actualizar UI
            if (this.pauseRecordBtn && this.resumeRecordBtn) {
                this.resumeRecordBtn.classList.add('hidden');
                this.pauseRecordBtn.classList.remove('hidden');
            }
            
            this.showNotification('info', 'Grabación reanudada');
        }
    }

    finishRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.isPaused = false;
            this.currentState = 'processing';
            
            // Crear patrón de frecuencias antes de detener stream
            this.createFrequencyPattern();
            
            // El processRecording se ejecutará automáticamente en el event listener
        }
    }

    deleteRecording() {
        if (this.isRecording) {
            // Detener grabación
            if (this.mediaRecorder) {
                this.mediaRecorder.stop();
            }
            
            // Detener stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            // Limpiar datos
            this.audioChunks = [];
            this.isRecording = false;
            this.isPaused = false;
            
            // Limpiar timers
            this.stopTimer();
            this.stopVisualization();
            
            // Ocultar interfaz de grabación
            this.hideRecordingInterface();
            
            this.showNotification('info', 'Grabación eliminada');
        }
    }

    // Formatear duración en formato mm:ss
    formatDuration(duration) {
        if (!duration || duration === "0:00") return "0:00";
        
        // Si ya está en formato mm:ss, devolverlo tal como está
        if (typeof duration === 'string' && duration.includes(':')) {
            return duration;
        }
        
        // Si es un número en segundos, convertir a mm:ss
        if (typeof duration === 'number') {
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        return duration;
    }

    // Función para buscar en el audio de preview
    seekPreviewAudio(percentage) {
        const audioElement = document.getElementById('audio-preview-element');
        if (audioElement && audioElement.duration) {
            const newTime = (percentage / 100) * audioElement.duration;
            audioElement.currentTime = newTime;
        }
    }

    // Generar barras de frecuencia para el preview
    generatePreviewFrequencyBars() {
        // Usar frecuencias calculadas de la grabación actual o generar por defecto
        let frequencies = [];
        
        if (this.recordedFrequencies && this.recordedFrequencies.length > 0) {
            frequencies = this.getAverageFrequencies();
        }
        
        if (!frequencies.length) {
            frequencies = this.generateDefaultPreviewFrequencies();
        }
        
        // Generar HTML de las barras
        return frequencies.map((freq, index) => {
            const height = Math.max(2, Math.min(20, (freq / 255) * 18 + 2));
            return `<div class="frequency-bar-preview" data-index="${index}" style="height: ${height}px;"></div>`;
        }).join('');
    }

    // Generar frecuencias por defecto para preview
    generateDefaultPreviewFrequencies() {
        const bars = 40; // Menos barras para el preview
        const frequencies = [];
        
        for (let i = 0; i < bars; i++) {
            const baseHeight = 80 + Math.random() * 100;
            const wave = Math.sin(i * 0.4) * 30;
            const randomness = (Math.random() - 0.5) * 50;
            
            let frequency = baseHeight + wave + randomness;
            frequency = Math.max(40, Math.min(255, frequency));
            
            frequencies.push(Math.round(frequency));
        }
        
        return frequencies;
    }

    // Función para buscar en el preview haciendo click
    seekPreviewByClick(event) {
        const audio = document.getElementById('audio-preview-element');
        const waveformContainer = event.currentTarget;
        
        if (!audio || !audio.duration) return;
        
        const rect = waveformContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const containerWidth = rect.width;
        const percentage = (clickX / containerWidth) * 100;
        
        // Limitar entre 0 y 100
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        
        const newTime = (clampedPercentage / 100) * audio.duration;
        audio.currentTime = newTime;
        
        // Actualizar visualmente el progreso
        const progressOverlay = document.getElementById('preview-progress-overlay');
        const currentTimeEl = document.getElementById('preview-current-time');
        
        if (progressOverlay) {
            progressOverlay.style.width = `${clampedPercentage}%`;
        }
        
        if (currentTimeEl) {
            const minutes = Math.floor(newTime / 60);
            const seconds = Math.floor(newTime % 60);
            currentTimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // Actualizar el método togglePreviewPlayback para funcionar con el nuevo diseño
    async togglePreviewPlayback() {
        const audio = document.getElementById('audio-preview-element');
        const playBtn = document.querySelector('.audio-play-btn-complete-preview');
        const playTriangle = playBtn?.querySelector('.play-triangle-preview');
        const progressOverlay = document.getElementById('preview-progress-overlay');
        const currentTimeEl = document.getElementById('preview-current-time');
        const totalTimeEl = document.getElementById('preview-total-time');
        
        if (!audio || !playBtn) {
            console.error('Audio element or play button not found');
            return;
        }
        
        try {
            // Configurar volumen
            audio.volume = 1.0;
            console.log('Preview audio src:', audio.src, 'readyState:', audio.readyState);
            
            if (audio.paused) {
                // Verificar que el audio esté listo antes de reproducir
                if (audio.readyState < 2) {
                    console.log('Preview audio no está listo, esperando...');
                    audio.load();
                    await new Promise((resolve) => {
                        audio.addEventListener('canplay', resolve, { once: true });
                    });
                }
                
                console.log('Starting preview playback...');
                await audio.play();
                
                // Cambiar a icono de pausa (cuadrado blanco)
                if (playTriangle) {
                    playTriangle.style.width = '12px';
                    playTriangle.style.height = '12px';
                    playTriangle.style.background = 'white';
                    playTriangle.style.border = 'none';
                    playTriangle.style.borderRadius = '1px';
                }
                
                // Actualizar progreso en tiempo real
                const updateProgress = () => {
                    if (!audio.paused && audio.duration) {
                        const progress = (audio.currentTime / audio.duration) * 100;
                        if (progressOverlay) {
                            progressOverlay.style.width = `${progress}%`;
                        }
                        
                        // Mostrar tiempo transcurrido
                        const elapsed = audio.currentTime;
                        const minutes = Math.floor(elapsed / 60);
                        const seconds = Math.floor(elapsed % 60);
                        if (currentTimeEl) {
                            currentTimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        }
                        
                        requestAnimationFrame(updateProgress);
                    }
                };
                updateProgress();
                
                // Eventos para manejar el final
                audio.onended = () => {
                    // Restaurar icono de play
                    if (playTriangle) {
                        playTriangle.style.width = '0';
                        playTriangle.style.height = '0';
                        playTriangle.style.borderLeft = '12px solid white';
                        playTriangle.style.borderTop = '7px solid transparent';
                        playTriangle.style.borderBottom = '7px solid transparent';
                        playTriangle.style.borderRight = 'none';
                        playTriangle.style.background = 'none';
                        playTriangle.style.borderRadius = '0';
                    }
                    if (progressOverlay) {
                        progressOverlay.style.width = '0%';
                    }
                    // Restaurar duración original
                    audio.currentTime = 0;
                    if (currentTimeEl) {
                        currentTimeEl.textContent = '0:00';
                    }
                };
                
                // Evento para manejar errores
                audio.onerror = (e) => {
                    console.error('Error playing preview audio:', e);
                    if (playTriangle) {
                        playTriangle.style.width = '0';
                        playTriangle.style.height = '0';
                        playTriangle.style.borderLeft = '12px solid white';
                        playTriangle.style.borderTop = '7px solid transparent';
                        playTriangle.style.borderBottom = '7px solid transparent';
                        playTriangle.style.borderRight = 'none';
                        playTriangle.style.background = 'none';
                        playTriangle.style.borderRadius = '0';
                    }
                    this.showNotification('error', 'Error al reproducir el audio');
                };
                
            } else {
                audio.pause();
                
                // Cambiar de vuelta a icono de play (triángulo)
                if (playTriangle) {
                    playTriangle.style.width = '0';
                    playTriangle.style.height = '0';
                    playTriangle.style.borderLeft = '12px solid white';
                    playTriangle.style.borderTop = '7px solid transparent';
                    playTriangle.style.borderBottom = '7px solid transparent';
                    playTriangle.style.borderRight = 'none';
                    playTriangle.style.background = 'none';
                    playTriangle.style.borderRadius = '0';
                }
            }
        } catch (error) {
            console.error('Error toggling preview playback:', error);
            if (playTriangle) {
                playTriangle.style.width = '0';
                playTriangle.style.height = '0';
                playTriangle.style.borderLeft = '12px solid white';
                playTriangle.style.borderTop = '7px solid transparent';
                playTriangle.style.borderBottom = '7px solid transparent';
                playTriangle.style.borderRight = 'none';
                playTriangle.style.background = 'none';
                playTriangle.style.borderRadius = '0';
            }
            this.showNotification('error', 'No se pudo reproducir el audio');
        }
    }

    // Método para limpiar recursos
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        
        this.stopTimer();
        this.stopVisualization();
        
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
    }
}

// Event listener para ESC key (cancelar grabación)
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && window.audioRecorder) {
        window.audioRecorder.cancelRecording();
    }
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para que otros scripts se carguen
    setTimeout(() => {
        window.audioRecorder = new AudioRecorder();
        console.log('Audio Recorder initialized successfully');
    }, 500);
});

// Limpiar recursos al cerrar la página
window.addEventListener('beforeunload', () => {
    if (window.audioRecorder) {
        window.audioRecorder.cleanup();
    }
});

// Export para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioRecorder;
}