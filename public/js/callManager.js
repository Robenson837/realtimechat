/**
 * Modern Call Manager - WebRTC Implementation
 * Handles audio/video calls with modern interface
 * Uses official app colors and responsive design
 */

class CallManager {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isCallActive = false;
    this.isVideoEnabled = true;
    this.isAudioEnabled = true;
    this.isSpeakerEnabled = false;
    this.callStartTime = null;
    this.callDurationTimer = null;
    this.currentCallType = null; // 'audio' or 'video'
    this.currentContact = null;
    this.facingMode = 'user'; // 'user' or 'environment'
    this.callId = null;
    this.isInitiator = false;
    this.candidatesQueue = [];
    this.connectionState = 'new';
    
    // Call sounds
    this.callSounds = {
      outgoing: null,
      incoming: null,
      connected: null,
      ended: null
    };
    this.currentRingtone = null;
    
    // Enhanced ICE servers configuration with TURN server for NAT traversal
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };

    this.initializeElements();
    this.initializeCallSounds();
    this.bindEvents();
  }

  initializeElements() {
    // Modal elements
    this.callModal = document.getElementById('call-modal');
    
    // Header elements
    this.callContactName = document.getElementById('call-contact-name');
    this.callContactAvatar = document.getElementById('call-contact-avatar');
    this.callStatus = document.getElementById('call-status');
    this.callDuration = document.getElementById('call-duration');
    
    // Video elements
    this.callVideoContainer = document.getElementById('call-video-container');
    this.localVideo = document.getElementById('local-video');
    this.remoteVideo = document.getElementById('remote-video');
    this.audioCallDisplay = document.getElementById('audio-call-display');
    this.audioContactAvatar = document.getElementById('audio-contact-avatar');
    
    // Control buttons
    this.toggleAudioBtn = document.getElementById('toggle-audio-btn');
    this.toggleVideoBtn = document.getElementById('toggle-video-btn');
    this.switchCameraBtn = document.getElementById('switch-camera-btn');
    this.toggleSpeakerBtn = document.getElementById('toggle-speaker-btn');
    this.endCallBtn = document.getElementById('end-call-btn');
    
    // Incoming call elements
    this.incomingCallInterface = document.getElementById('incoming-call-interface');
    this.incomingContactName = document.getElementById('incoming-contact-name');
    this.incomingContactAvatar = document.getElementById('incoming-contact-avatar');
    this.incomingCallType = document.getElementById('incoming-call-type');
    this.acceptCallBtn = document.getElementById('accept-call-btn');
    this.declineCallBtn = document.getElementById('decline-call-btn');
    
    // Call trigger buttons
    this.callBtn = document.getElementById('call-btn');
    this.videoBtn = document.getElementById('video-btn');
    this.mobileCallBtn = document.getElementById('call-mobile-btn');
    this.mobileVideoBtn = document.getElementById('video-mobile-btn');
    this.quickCallBtn = document.getElementById('quick-call-btn');
    this.quickVideoBtn = document.getElementById('quick-video-btn');
  }

  bindEvents() {
    // Control button events
    if (this.toggleAudioBtn) {
      this.toggleAudioBtn.addEventListener('click', () => this.toggleAudio());
    }
    
    if (this.toggleVideoBtn) {
      this.toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
    }
    
    if (this.switchCameraBtn) {
      this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
    }
    
    if (this.toggleSpeakerBtn) {
      this.toggleSpeakerBtn.addEventListener('click', () => this.toggleSpeaker());
    }
    
    if (this.endCallBtn) {
      this.endCallBtn.addEventListener('click', () => this.endCall());
    }
    
    // Incoming call events
    if (this.acceptCallBtn) {
      this.acceptCallBtn.addEventListener('click', () => this.acceptCall());
    }
    
    if (this.declineCallBtn) {
      this.declineCallBtn.addEventListener('click', () => this.declineCall());
    }
    
    // Call trigger events
    if (this.callBtn) {
      this.callBtn.addEventListener('click', () => this.initiateCall('audio'));
    }
    
    if (this.videoBtn) {
      this.videoBtn.addEventListener('click', () => this.initiateCall('video'));
    }
    
    if (this.mobileCallBtn) {
      this.mobileCallBtn.addEventListener('click', () => this.initiateCall('audio'));
    }
    
    if (this.mobileVideoBtn) {
      this.mobileVideoBtn.addEventListener('click', () => this.initiateCall('video'));
    }
    
    if (this.quickCallBtn) {
      this.quickCallBtn.addEventListener('click', () => this.initiateCall('audio'));
    }
    
    if (this.quickVideoBtn) {
      this.quickVideoBtn.addEventListener('click', () => this.initiateCall('video'));
    }

    // Handle escape key to end calls
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isCallActive) {
        this.endCall();
      }
    });
  }

  initializeCallSounds() {
    try {
      // Create audio elements for call sounds
      this.callSounds.outgoing = this.createAudioElement('outgoing', true); // Loop outgoing tone
      this.callSounds.incoming = this.createAudioElement('incoming', true); // Loop incoming ringtone
      this.callSounds.connected = this.createAudioElement('connected', false);
      this.callSounds.ended = this.createAudioElement('ended', false);
      
      console.log('CALL: Call sounds initialized');
    } catch (error) {
      console.error('Error initializing call sounds:', error);
    }
  }

  createAudioElement(type, loop = false) {
    const audio = new Audio();
    audio.loop = loop;
    audio.volume = 0.7;
    audio.preload = 'auto';
    
    // Use Web Audio API to generate tones since we don't have audio files
    switch (type) {
      case 'outgoing':
        // Generate outgoing call tone (beep-beep pattern)
        this.generateCallTone(audio, [800, 0, 800, 0], [0.3, 0.2, 0.3, 1.0]);
        break;
      case 'incoming':
        // Generate incoming ringtone (classic phone ring)
        this.generateCallTone(audio, [480, 620], [0.5, 0.5]);
        break;
      case 'connected':
        // Short beep for connection
        this.generateCallTone(audio, [1000], [0.2]);
        break;
      case 'ended':
        // Busy tone
        this.generateCallTone(audio, [480, 620], [0.25, 0.25]);
        break;
    }
    
    return audio;
  }

  generateCallTone(audioElement, frequencies, durations) {
    // Use Web Audio API to generate call tones
    let audioContext = null;
    let oscillatorInterval = null;
    
    audioElement.play = () => {
      try {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
        // Play tone sequence repeatedly for looped sounds
        this.playToneSequence(audioContext, frequencies, durations);
        
        if (audioElement.loop) {
          const totalDuration = durations.reduce((sum, d) => sum + d, 0) * 1000;
          oscillatorInterval = setInterval(() => {
            if (audioContext && audioContext.state === 'running') {
              this.playToneSequence(audioContext, frequencies, durations);
            }
          }, totalDuration);
        }
        
        console.log(`SOUND: Playing tone: ${frequencies}Hz`);
      } catch (error) {
        console.error('Error playing tone:', error);
      }
    };
    
    audioElement.pause = () => {
      try {
        // Clear interval for looped sounds
        if (oscillatorInterval) {
          clearInterval(oscillatorInterval);
          oscillatorInterval = null;
        }
        
        // Stop all oscillators
        if (this.currentOscillators) {
          this.currentOscillators.forEach(osc => {
            try {
              osc.stop();
            } catch (e) {
              // Oscillator might already be stopped
            }
          });
          this.currentOscillators = [];
        }
        
        console.log('MUTE: Stopped tone playback');
      } catch (error) {
        console.error('Error stopping tone:', error);
      }
    };
  }

  playToneSequence(audioContext, frequencies, durations) {
    if (!this.currentOscillators) {
      this.currentOscillators = [];
    }
    
    let currentTime = audioContext.currentTime;
    
    frequencies.forEach((freq, index) => {
      if (freq > 0) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + durations[index]);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + durations[index]);
        
        this.currentOscillators.push(oscillator);
      }
      
      currentTime += durations[index];
    });
  }

  async initiateCall(type) {
    console.log(`CALL: Iniciando llamada ${type}...`);
    
    if (this.isCallActive) {
      window.Utils?.TranslatedNotifications?.error('notifications.call_already_active') || this.showNotification('Ya hay una llamada en curso', 'error');
      return;
    }
    
    if (!window.chatManager || !window.chatManager.currentConversation) {
      window.Utils?.TranslatedNotifications?.error('notifications.select_conversation') || this.showNotification('Selecciona una conversación primero', 'error');
      return;
    }

    this.currentCallType = type;
    const conversation = window.chatManager.currentConversation;
    this.currentContact = {
      ...conversation,
      profilePhoto: conversation.avatar || conversation.profilePhoto || 'images/user-placeholder-40.svg',
      name: conversation.name || conversation.username || 'Usuario'
    };
    
    // Verificar estado del contacto antes de llamar
    const recipientId = this.getRecipientId();
    if (recipientId) {
      try {
        console.log(`DEBUG: Checking availability for ${this.currentContact.name} before calling...`);
        
        // Obtener estado actual del contacto en tiempo real
        const contactStatus = await this.checkContactStatus(recipientId);
        
        if (contactStatus) {
          console.log(`STATS: Contact status result:`, contactStatus);
          
          if (!contactStatus.isAvailable) {
            if (contactStatus.status === 'recently-active') {
              window.Utils?.TranslatedNotifications?.info('notifications.user_recently_active', {name: this.currentContact.name}) || this.showNotification(`${this.currentContact.name} estuvo activo recientemente, intentando llamar...`, 'info');
            } else if (contactStatus.status === 'offline') {
              window.Utils?.TranslatedNotifications?.info('notifications.user_not_available', {name: this.currentContact.name}) || this.showNotification(`${this.currentContact.name} no está disponible, pero intentando llamar de todos modos...`, 'info');
            }
          } else {
            console.log(`SUCCESS: ${this.currentContact.name} está disponible para llamadas (${contactStatus.source})`);
            window.Utils?.TranslatedNotifications?.success('notifications.calling_user', {name: this.currentContact.name}) || this.showNotification(`Llamando a ${this.currentContact.name}...`, 'info');
          }
        } else {
          console.warn(`WARN: No se pudo verificar el estado de ${this.currentContact.name}, intentando llamar...`);
          this.showNotification(`Verificando disponibilidad e intentando llamar...`, 'info');
        }
      } catch (error) {
        console.warn('Could not check contact status:', error);
        this.showNotification('Intentando llamar...', 'info');
      }
    }
    
    try {
      // Setup local stream
      await this.setupLocalStream(type);
      
      // Show call interface
      this.showCallInterface();
      
      // Generate unique call ID
      this.callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.isInitiator = true;
      
      // Setup peer connection
      await this.setupPeerConnection();
      
      // Create and set local description (offer)
      const offer = await this.createOffer();
      
      // Update UI for outgoing call with smooth transitions
      this.updateCallInterface('outgoing');
      this.addRippleEffect();
      
      // Show WhatsApp-style connecting animation
      this.startConnectingAnimation();
      
      // Record call start in history
      if (window.callHistoryManager) {
        window.callHistoryManager.recordOutgoingCall(this.currentContact, type);
      }
      
      // Emit call started event
      this.dispatchCallEvent('callStarted', {
        contactId: this.getRecipientId(),
        contactName: this.currentContact.name || this.currentContact.username,
        contactAvatar: this.currentContact.profilePhoto,
        type: type,
        direction: 'outgoing'
      });
      
      // Add call message to conversation
      this.addCallMessageToConversation('outgoing', type, 'calling');
      
        // Emit call signal to server with offer
      this.emitCallSignal('call:initiate', {
        callId: this.callId,
        to: this.getRecipientId(),
        type: type,
        offer: offer,
        from: {
          userId: this.getCurrentUserId(),
          name: this.getCurrentUserName(),
          profilePhoto: this.getCurrentUserAvatar()
        }
      });
      
      this.isCallActive = true;
      this.startCallTimer();
      
      // Start outgoing call sound (only for the caller)
      this.playCallSound('outgoing');
      console.log('🔊 Playing OUTGOING sound for caller');
      
      // Set timeout for unanswered calls (30 seconds)
      this.callTimeout = setTimeout(() => {
        console.log('📞 Llamada sin respuesta después de 30 segundos');
        this.handleUnansweredCall();
      }, 30000);
      
    } catch (error) {
      console.error('Error iniciando llamada:', error);
      window.Utils?.TranslatedNotifications?.error('notifications.call_failed_start') || this.showNotification('Error al iniciar la llamada', 'error');
      this.endCall();
    }
  }

  async setupLocalStream(type) {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      },
      video: type === 'video' ? {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 15 },
        facingMode: this.facingMode
      } : false
    };

    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    if (this.localVideo) {
      this.localVideo.srcObject = this.localStream;
    }
    
    console.log(`VIDEO: Stream local configurado para llamada ${type}`);
  }

  async setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceServers);
    this.connectionState = 'connecting';
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('SIGNAL: Remote track received');
      this.remoteStream = event.streams[0];
      if (this.remoteVideo) {
        this.remoteVideo.srcObject = this.remoteStream;
      }
      this.connectionState = 'connected';
      this.updateCallInterface('connected');
      this.stopCallSound('outgoing');
      this.playCallSound('connected');
    };
    
    // Handle ICE candidates with queueing
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitCallSignal('call:ice-candidate', {
          callId: this.callId,
          to: this.getRecipientId(),
          candidate: event.candidate
        });
      } else {
        console.log('SIGNAL: ICE gathering completed');
      }
    };
    
    // Handle connection state changes with detailed logging
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('SIGNAL: Connection state changed to:', state);
      this.connectionState = state;
      
      switch (state) {
        case 'connecting':
          this.updateCallStatus('Conectando...');
          break;
        case 'connected':
          this.updateCallStatus('Conectado');
          this.onCallConnected();
          break;
        case 'disconnected':
          this.updateCallStatus('Desconectado');
          console.warn('Connection disconnected, attempting to reconnect...');
          break;
        case 'failed':
          this.updateCallStatus('Conexión fallida');
          console.error('Connection failed');
          setTimeout(() => this.endCall('connection-failed'), 3000);
          break;
        case 'closed':
          console.log('Connection closed');
          break;
      }
    };
    
    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('SIGNAL: ICE connection state:', this.peerConnection.iceConnectionState);
      
      switch (this.peerConnection.iceConnectionState) {
        case 'checking':
          this.updateCallStatus('Estableciendo conexión...');
          break;
        case 'connected':
        case 'completed':
          this.updateCallStatus('Conectado');
          break;
        case 'failed':
          console.error('ICE connection failed');
          this.updateCallStatus('Error de conexión');
          setTimeout(() => this.endCall('ice-failed'), 5000);
          break;
        case 'disconnected':
          this.updateCallStatus('Reconectando...');
          break;
        case 'closed':
          console.log('ICE connection closed');
          break;
      }
    };
    
    // Handle signaling state changes
    this.peerConnection.onsignalingstatechange = () => {
      console.log('SIGNAL: Signaling state:', this.peerConnection.signalingState);
    };
  }

  async createOffer() {
    const offerOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.currentCallType === 'video'
    };
    
    const offer = await this.peerConnection.createOffer(offerOptions);
    await this.peerConnection.setLocalDescription(offer);
    console.log('SEND: Offer created and set as local description');
    return offer;
  }

  async createAnswer() {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log('SEND: Answer created and set as local description');
    return answer;
  }

  showCallInterface() {
    console.log('CALL: Showing main call interface');
    
    if (this.callModal) {
      // Ensure call modal is visible
      this.callModal.classList.add('active');
      this.callModal.style.display = 'flex';
      
      // Show the main call container and hide incoming interface
      const callContainer = this.callModal.querySelector('.call-container');
      if (callContainer) {
        callContainer.style.display = 'block';
        console.log('SUCCESS: Main call container shown');
      }
      
      document.body.style.overflow = 'hidden';
      document.body.classList.add('call-active');
    }
    
    // Hide incoming call interface
    if (this.incomingCallInterface) {
      this.incomingCallInterface.style.display = 'none';
      this.incomingCallInterface.style.transform = 'translateY(-100%)';
      this.incomingCallInterface.style.opacity = '0';
      
      setTimeout(() => {
        this.incomingCallInterface.classList.remove('active');
      }, 200);
    }
  }

  hideCallInterface() {
    if (this.callModal) {
      // Smooth exit animation like WhatsApp
      this.callModal.style.transition = 'all 0.3s ease-in';
      this.callModal.style.transform = 'scale(0.9) translateY(50px)';
      this.callModal.style.opacity = '0';
      
      setTimeout(() => {
        this.callModal.classList.remove('active');
        this.callModal.style.transform = '';
        this.callModal.style.opacity = '';
        this.callModal.style.transition = '';
      }, 300);
      
      document.body.style.overflow = '';
      document.body.classList.remove('call-active');
    }
  }

  updateCallInterface(state) {
    console.log('RENDER: Updating call interface with state:', state);
    console.log('RENDER: Current contact:', this.currentContact);
    
    // Update contact info with smooth animations
    if (this.currentContact) {
      const contactName = this.currentContact.name || this.currentContact.username || window.i18n?.t('common.unknown_user') || 'Usuario';
      const contactAvatar = this.currentContact.profilePhoto || this.currentContact.avatar || 'images/user-placeholder-40.svg';
      
      console.log('RENDER: Contact name:', contactName);
      console.log('RENDER: Contact avatar:', contactAvatar);
      console.log('RENDER: Elements check - callContactName:', !!this.callContactName);
      console.log('RENDER: Elements check - callContactAvatar:', !!this.callContactAvatar);
      
      // Force update name directly (skip animation for now)
      if (this.callContactName) {
        this.callContactName.textContent = contactName;
        console.log('SUCCESS: Contact name updated in UI');
      }
      
      // Force update avatar directly 
      if (this.callContactAvatar) {
        this.callContactAvatar.src = contactAvatar;
        this.callContactAvatar.alt = contactName;
        console.log('SUCCESS: Contact avatar updated in UI');
      }
      if (this.audioContactAvatar) {
        this.audioContactAvatar.src = contactAvatar;
        this.audioContactAvatar.alt = contactName;
        console.log('SUCCESS: Audio contact avatar updated in UI');
      }
    } else {
      console.warn('WARN: No currentContact available for UI update');
    }
    
    // Show/hide video elements based on call type
    if (this.currentCallType === 'video') {
      this.callVideoContainer?.classList.remove('audio-only');
      this.audioCallDisplay?.classList.remove('active');
      if (this.toggleVideoBtn) this.toggleVideoBtn.style.display = 'flex';
      if (this.switchCameraBtn) this.switchCameraBtn.style.display = 'flex';
    } else {
      this.callVideoContainer?.classList.add('audio-only');
      this.audioCallDisplay?.classList.add('active');
      if (this.toggleVideoBtn) this.toggleVideoBtn.style.display = 'none';
      if (this.switchCameraBtn) this.switchCameraBtn.style.display = 'none';
    }
    
    // Update status based on state with translations
    switch (state) {
      case 'outgoing':
        this.updateCallStatus(window.i18n?.t('calls.outgoing') || 'Llamando...');
        break;
      case 'incoming':
        this.updateCallStatus(window.i18n?.t('calls.incoming') || 'Llamada entrante');
        break;
      case 'connecting':
        this.updateCallStatus(window.i18n?.t('calls.connecting') || 'Conectando...');
        break;
      case 'connected':
        this.updateCallStatus(window.i18n?.t('calls.connected') || 'Conectado');
        this.stopConnectingAnimation();
        break;
    }
  }

  updateCallStatus(status) {
    if (this.callStatus) {
      // Animate status change like WhatsApp
      this.callStatus.style.transition = 'opacity 0.2s ease';
      this.callStatus.style.opacity = '0';
      
      setTimeout(() => {
        this.callStatus.textContent = status;
        this.callStatus.style.opacity = '1';
      }, 100);
    }
  }
  
  // WhatsApp-style animation methods
  addRippleEffect() {
    const buttons = document.querySelectorAll('.call-control-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', this.createRipple.bind(this));
    });
  }
  
  createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      background-color: rgba(255, 255, 255, 0.3);
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
    `;
    
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
  
  startConnectingAnimation() {
    const avatar = this.audioContactAvatar || this.callContactAvatar;
    if (avatar) {
      avatar.style.animation = 'pulse 2s infinite';
      avatar.classList.add('connecting');
    }
    
    // Add connecting dots animation
    if (this.callStatus) {
      this.connectingInterval = setInterval(() => {
        const text = this.callStatus.textContent;
        if (text.includes('...')) {
          this.callStatus.textContent = text.replace('...', '');
        } else if (text.includes('..')) {
          this.callStatus.textContent = text + '.';
        } else if (text.includes('.')) {
          this.callStatus.textContent = text + '.';
        } else if (text.includes('Conectando') || text.includes('Connecting')) {
          this.callStatus.textContent = text + '.';
        }
      }, 500);
    }
  }
  
  stopConnectingAnimation() {
    const avatar = this.audioContactAvatar || this.callContactAvatar;
    if (avatar) {
      avatar.style.animation = '';
      avatar.classList.remove('connecting');
    }
    
    if (this.connectingInterval) {
      clearInterval(this.connectingInterval);
      this.connectingInterval = null;
    }
  }
  
  animateTextChange(element, newText) {
    element.style.transition = 'opacity 0.2s ease';
    element.style.opacity = '0';
    
    setTimeout(() => {
      element.textContent = newText;
      element.style.opacity = '1';
    }, 100);
  }
  
  animateAvatarChange(element, newSrc) {
    element.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    element.style.opacity = '0';
    element.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      element.src = newSrc;
      element.style.opacity = '1';
      element.style.transform = 'scale(1)';
    }, 100);
  }

  toggleAudio() {
    if (!this.localStream) return;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isAudioEnabled = audioTrack.enabled;
      
      if (this.toggleAudioBtn) {
        if (this.isAudioEnabled) {
          this.toggleAudioBtn.classList.remove('muted');
          this.toggleAudioBtn.innerHTML = '<i class="fas fa-microphone"></i>';
          this.toggleAudioBtn.title = window.i18n?.t('calls.mute') || 'Silenciar micrófono';
          this.toggleAudioBtn.setAttribute('data-i18n-title', 'calls.mute');
        } else {
          this.toggleAudioBtn.classList.add('muted');
          this.toggleAudioBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
          this.toggleAudioBtn.title = window.i18n?.t('calls.unmute') || 'Activar micrófono';
          this.toggleAudioBtn.setAttribute('data-i18n-title', 'calls.unmute');
        }
        
        // Add shake animation for feedback
        this.toggleAudioBtn.style.animation = 'buttonFeedback 0.2s ease';
      }
      
      // Notify remote peer
      this.emitCallSignal('audio_toggle', {
        to: this.getRecipientId(),
        enabled: this.isAudioEnabled
      });
    }
  }

  toggleVideo() {
    if (!this.localStream || this.currentCallType !== 'video') return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.isVideoEnabled = videoTrack.enabled;
      
      if (this.toggleVideoBtn) {
        if (this.isVideoEnabled) {
          this.toggleVideoBtn.classList.remove('disabled');
          this.toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
          this.toggleVideoBtn.title = window.i18n?.t('calls.video_off') || 'Desactivar video';
          this.toggleVideoBtn.setAttribute('data-i18n-title', 'calls.video_off');
        } else {
          this.toggleVideoBtn.classList.add('disabled');
          this.toggleVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
          this.toggleVideoBtn.title = window.i18n?.t('calls.video_on') || 'Activar video';
          this.toggleVideoBtn.setAttribute('data-i18n-title', 'calls.video_on');
        }
        
        // Add visual feedback
        this.toggleVideoBtn.style.animation = 'buttonFeedback 0.2s ease';
      }
      
      // Show/hide local video
      if (this.localVideo) {
        this.localVideo.style.display = this.isVideoEnabled ? 'block' : 'none';
      }
      
      // Notify remote peer
      this.emitCallSignal('video_toggle', {
        to: this.getRecipientId(),
        enabled: this.isVideoEnabled
      });
    }
  }

  async switchCamera() {
    if (!this.localStream || this.currentCallType !== 'video') return;
    
    try {
      // Stop current video track
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }
      
      // Switch facing mode
      this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
      
      // Get new video stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          facingMode: this.facingMode
        }
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in peer connection
      const sender = this.peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
      
      // Update local stream
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);
      
      // Update local video element
      if (this.localVideo) {
        this.localVideo.srcObject = this.localStream;
      }
      
      console.log(`VIDEO: Cámara cambiada a: ${this.facingMode}`);
      
      // Show feedback notification
      const message = this.facingMode === 'user' ? 
        (window.i18n?.t('calls.camera_front') || 'Cámara frontal activada') :
        (window.i18n?.t('calls.camera_back') || 'Cámara trasera activada');
      window.Utils?.TranslatedNotifications?.info('notifications.camera_switched', {mode: this.facingMode}) || this.showNotification(message, 'info');
      
    } catch (error) {
      console.error('Error cambiando cámara:', error);
      window.Utils?.TranslatedNotifications?.error('notifications.camera_switch_failed') || this.showNotification('Error al cambiar cámara', 'error');
    }
  }

  toggleSpeaker() {
    // This is a UI indicator - actual speaker control depends on device
    this.isSpeakerEnabled = !this.isSpeakerEnabled;
    
    if (this.toggleSpeakerBtn) {
      if (this.isSpeakerEnabled) {
        this.toggleSpeakerBtn.classList.add('active');
        this.toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        this.toggleSpeakerBtn.title = window.i18n?.t('calls.speaker_off') || 'Desactivar altavoz';
        this.toggleSpeakerBtn.setAttribute('data-i18n-title', 'calls.speaker_off');
      } else {
        this.toggleSpeakerBtn.classList.remove('active');
        this.toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        this.toggleSpeakerBtn.title = window.i18n?.t('calls.speaker_on') || 'Activar altavoz';
        this.toggleSpeakerBtn.setAttribute('data-i18n-title', 'calls.speaker_on');
      }
      
      // Add visual feedback
      this.toggleSpeakerBtn.style.animation = 'buttonFeedback 0.2s ease';
    }
    
    // Set audio output (if supported)
    if (this.remoteVideo && this.remoteVideo.setSinkId) {
      try {
        this.remoteVideo.setSinkId(this.isSpeakerEnabled ? 'default' : '');
      } catch (error) {
        console.log('setSinkId not supported');
      }
    }
  }

  startCallTimer() {
    this.callStartTime = new Date();
    this.callDurationTimer = setInterval(() => {
      const duration = new Date() - this.callStartTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      
      if (this.callDuration) {
        this.callDuration.textContent = 
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  stopCallTimer() {
    if (this.callDurationTimer) {
      clearInterval(this.callDurationTimer);
      this.callDurationTimer = null;
    }
    
    if (this.callDuration) {
      this.callDuration.textContent = '00:00';
    }
  }

  endCall(reason = 'ended') {
    console.log('CALL: Ending call...', { reason, callId: this.callId });
    
    // Emit call ended event before cleanup
    if (this.isCallActive && this.currentContact && reason !== 'remote-ended') {
      this.emitCallSignal('call:end', {
        callId: this.callId,
        to: this.getRecipientId(),
        reason: reason
      });
    }
    
    // Dispatch local event
    if (this.isCallActive && this.currentContact) {
      this.dispatchCallEvent('callEnded', {
        contactId: this.getRecipientId(),
        contactName: this.currentContact.name || this.currentContact.username,
        contactAvatar: this.currentContact.profilePhoto,
        type: this.currentCallType,
        direction: this.isInitiator ? 'outgoing' : 'incoming',
        reason: reason,
        duration: this.getCallDuration()
      });
    }
    
    // Update call message with final status
    this.updateCallMessageInConversation(reason === 'remote-ended' ? 'ended' : reason);
    
    // Save final call record
    this.saveCallToHistory(reason);
    
    // Cleanup resources
    this.cleanup();
    
    // Hide interface
    this.hideCallInterface();
    
    console.log('SUCCESS: Call ended successfully');
  }
  
  cleanup() {
    console.log('CLEANUP: Cleaning up call resources...');
    
    // Stop all media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped local track:', track.kind);
      });
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped remote track:', track.kind);
      });
      this.remoteStream = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('Peer connection closed');
    }
    
    // Clear video elements
    if (this.localVideo) this.localVideo.srcObject = null;
    if (this.remoteVideo) this.remoteVideo.srcObject = null;
    
    // Stop timers
    this.stopCallTimer();
    
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }
    
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }
    
    // Stop all sounds
    this.stopAllCallSounds();
    
    // Reset state
    this.resetState();
    
    console.log('✅ Cleanup completed');
  }

  handleUnansweredCall() {
    console.log('📞 Llamada sin respuesta - registrando como perdida');
    
    // Stop outgoing sound
    this.stopCallSound('outgoing');
    
    // Play ended/busy tone
    this.playCallSound('ended');
    
    // Update call status
    this.updateCallStatus('Sin respuesta');
    
    // Update call message in conversation
    this.updateCallMessageInConversation('missed');
    
    // Record as missed call in history
    if (this.currentContact) {
      const callData = {
        contactId: this.getRecipientId(),
        contactName: this.currentContact.name || this.currentContact.username,
        contactAvatar: this.currentContact.profilePhoto,
        type: this.currentCallType
      };
      
      // Dispatch missed call event
      this.dispatchCallEvent('callMissed', callData);
      
      // Record in history manager
      if (window.callHistoryManager) {
        window.callHistoryManager.recordMissedCall(callData, this.currentCallType);
      }
    }
    
    // End call after a short delay
    setTimeout(() => {
      this.endCall();
    }, 3000);
  }

  playCallSound(type) {
    try {
      if (this.callSounds[type]) {
        console.log(`🔊 Playing ${type} call sound`);
        this.callSounds[type].play();
        this.currentRingtone = type;
      }
    } catch (error) {
      console.error(`Error playing ${type} sound:`, error);
    }
  }

  stopCallSound(type) {
    try {
      if (this.callSounds[type]) {
        console.log(`🔇 Stopping ${type} call sound`);
        this.callSounds[type].pause();
        if (type === this.currentRingtone) {
          this.currentRingtone = null;
        }
      }
    } catch (error) {
      console.error(`Error stopping ${type} sound:`, error);
    }
  }

  stopAllCallSounds() {
    Object.keys(this.callSounds).forEach(type => {
      this.stopCallSound(type);
    });
    this.currentRingtone = null;
  }

  async acceptCall() {
    console.log('📞 Accepting incoming call from:', this.currentContact.name);
    
    try {
      // Limpiar timeout de llamada perdida
      if (this.incomingCallTimeout) {
        clearTimeout(this.incomingCallTimeout);
        this.incomingCallTimeout = null;
      }
      
      // Detener sonido de llamada entrante
      this.stopCallSound('incoming');
      
      // Mostrar notificación de aceptación
      this.showNotification(`Aceptando llamada de ${this.currentContact.name}...`, 'info');
      
      // Ocultar interfaz de llamada entrante
      this.hideIncomingCallInterface();
      
      // Configurar medios locales para la llamada
      await this.setupLocalStreamForIncomingCall();
      
      // Configurar peer connection y procesar la oferta
      await this.setupPeerConnectionForIncomingCall();
      
      // Crear y enviar respuesta
      const answer = await this.createAnswer();
      
      // Enviar señal de aceptación al emisor
      this.emitCallSignal('call:accept', {
        callId: this.callId,
        to: this.currentContact.userId,
        answer: answer
      });
      
      // Mostrar interfaz de llamada activa
      this.showCallInterface();
      this.updateCallInterface('connecting');
      this.isCallActive = true;
      
      // Actualizar mensaje de llamada
      this.updateCallMessageInConversation('accepted');
      
      console.log('SUCCESS: Call accepted successfully, waiting for connection...');
      
    } catch (error) {
      console.error('ERROR: Error accepting call:', error);
      this.showNotification(`Error al aceptar llamada: ${error.message}`, 'error');
      this.declineCall();
    }
  }
  
  async setupLocalStreamForIncomingCall() {
    console.log('🎥 Setting up local media for incoming call');
    
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: this.currentCallType === 'video' ? {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 15 },
        facingMode: 'user'
      } : false
    };
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Conectar stream local al elemento de video
      const localVideo = document.getElementById('local-video');
      if (localVideo) {
        localVideo.srcObject = this.localStream;
      }
      
      console.log('SUCCESS: Local media stream ready for incoming call');
      
    } catch (error) {
      console.error('ERROR: Error accessing media devices:', error);
      
      // Mostrar modal de permisos si es necesario
      if (error.name === 'NotAllowedError') {
        this.showPermissionsModal();
      }
      
      throw new Error('No se pudo acceder a la cámara/micrófono');
    }
  }
  
  async setupPeerConnectionForIncomingCall() {
    console.log('🔗 Setting up peer connection for incoming call');
    
    // Configurar peer connection
    await this.setupPeerConnection();
    
    // Establecer descripción remota (oferta del emisor)
    if (this.incomingOffer) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.incomingOffer));
      console.log('SUCCESS: Remote description (offer) set successfully');
      
      // Procesar candidatos ICE que puedan haber llegado antes
      while (this.candidatesQueue.length > 0) {
        const candidate = this.candidatesQueue.shift();
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('🧊 Queued ICE candidate processed');
        } catch (error) {
          console.warn('⚠️ Error processing queued ICE candidate:', error);
        }
      }
    }
  }

  declineCall() {
    console.log('📞 Declining call from:', this.currentContact?.name);
    
    // Limpiar timeout
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }
    
    // Detener sonido de llamada entrante
    this.stopCallSound('incoming');
    
    // Mostrar notificación de rechazo
    this.showNotification(`Llamada de ${this.currentContact?.name} rechazada`, 'info');
    
    // Enviar señal de rechazo al emisor con información detallada
    if (this.currentContact) {
      this.emitCallSignal('call:decline', {
        callId: this.callId,
        to: this.currentContact.userId,
        reason: 'user-declined',
        declinedBy: this.getCurrentUserId(),
        declinedByName: this.getCurrentUserName(),
        timestamp: Date.now()
      });
      
      console.log('📤 Decline signal sent to caller:', this.currentContact.userId);
    }
    
    // Actualizar mensaje de llamada
    this.updateCallMessageInConversation('declined');
    
    // Guardar en historial
    this.saveCallToHistory('declined');
    
    // Ocultar interfaz y limpiar estado
    this.hideIncomingCallInterface();
    this.resetState();
    
    console.log('SUCCESS: Call declined successfully');
  }

  resetState() {
    this.isCallActive = false;
    this.currentCallType = null;
    this.currentContact = null;
    this.callId = null;
    this.isInitiator = false;
    this.candidatesQueue = [];
    this.connectionState = 'new';
    this.isVideoEnabled = true;
    this.isAudioEnabled = true;
    this.isSpeakerEnabled = false;
    this.facingMode = 'user';
    this.callStartTime = null;
    
    // Reset button states
    this.resetButtonStates();
    
    console.log('📱 Call state reset');
  }

  resetButtonStates() {
    if (this.toggleAudioBtn) {
      this.toggleAudioBtn.classList.remove('muted');
      this.toggleAudioBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
    
    if (this.toggleVideoBtn) {
      this.toggleVideoBtn.classList.remove('disabled');
      this.toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
      this.toggleVideoBtn.style.display = 'flex';
    }
    
    if (this.switchCameraBtn) {
      this.switchCameraBtn.style.display = 'flex';
    }
    
    if (this.toggleSpeakerBtn) {
      this.toggleSpeakerBtn.classList.remove('active');
      this.toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
  }

  getRecipientId() {
    // Si es una llamada entrante, el "recipiente" es el emisor (quien nos llamó)
    if (!this.isInitiator && this.currentContact) {
      return this.currentContact.userId;
    }
    
    // Si es una llamada saliente, usar el ID del chat actual
    if (window.chatManager && window.chatManager.currentConversation) {
      return window.chatManager.getRecipientId();
    }
    
    return null;
  }

  emitCallSignal(event, data) {
    const socket = window.SocketManager?.socket || window.socket;
    
    if (!socket || !socket.connected) {
      console.error('ERROR: Socket not available for signaling', {
        hasSocketManager: !!window.SocketManager,
        hasSocket: !!socket,
        isConnected: socket?.connected
      });
      this.showNotification('Error de conexión. Verifica tu conexión a internet.', 'error');
      return;
    }
    
    // Enhanced data with metadata
    const signalData = {
      ...data,
      timestamp: Date.now(),
      socketId: socket.id,
      callId: data.callId || this.callId
    };
    
    // Add user info for call initiation
    if (event === 'call:initiate' && !signalData.from) {
      signalData.from = {
        userId: this.getCurrentUserId(),
        name: this.getCurrentUserName(),
        profilePhoto: this.getCurrentUserAvatar()
      };
    }
    
    console.log(`🚀 Emitting signal: ${event}`, {
      event,
      callId: signalData.callId,
      to: signalData.to,
      type: signalData.type || 'unknown',
      hasOffer: !!signalData.offer,
      hasAnswer: !!signalData.answer,
      hasCandidate: !!signalData.candidate
    });
    
    socket.emit(event, signalData);
    
    // Enhanced acknowledgment for critical events
    const criticalEvents = ['call:initiate', 'call:accept', 'call:decline', 'call:end'];
    if (criticalEvents.includes(event)) {
      setTimeout(() => {
        console.log(`SUCCESS: Signal ${event} sent (callId: ${signalData.callId})`);
      }, 50);
    }
  }

  showNotification(message, type = 'info') {
    // Use the existing notification system
    if (window.Utils && window.Utils.Notifications) {
      if (type === 'error') {
        window.Utils.Notifications.error(message);
      } else {
        window.Utils.Notifications.success(message);
      }
    } else {
      console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    }
  }

  onCallConnected() {
    console.log('SUCCESS: Call connected successfully');
    
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }
    
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }
    
    this.stopAllCallSounds();
    this.playCallSound('connected');
    
    // Update call status
    this.updateCallStatus('Conectado');
    
    // Start call timer
    this.callStartTime = new Date();
    this.startCallTimer();
    
    // Update call message
    this.updateCallMessageInConversation('answered');
    
    // Save to history
    this.saveCallToHistory('connected');
  }
  
  saveCallToHistory(status) {
    if (window.callHistoryManager && this.currentContact) {
      const callData = {
        contactId: this.getRecipientId(),
        contactName: this.currentContact.name || this.currentContact.username,
        contactAvatar: this.currentContact.profilePhoto,
        type: this.currentCallType,
        direction: this.isInitiator ? 'outgoing' : 'incoming',
        status: status,
        duration: this.getCallDuration(),
        timestamp: Date.now()
      };
      
      window.callHistoryManager.addCallRecord(callData);
    }
  }

  // Enhanced socket.io integration methods
  handleIncomingCall(data) {
    console.log('📞 ===== HANDLE INCOMING CALL START =====');
    console.log('📞 Incoming call received:', data);
    console.log('📞 Current isCallActive:', this.isCallActive);
    console.log('📞 Elements check:');
    console.log('   - incomingCallInterface:', !!this.incomingCallInterface);
    console.log('   - incomingContactName:', !!this.incomingContactName);
    console.log('   - incomingContactAvatar:', !!this.incomingContactAvatar);
    console.log('   - acceptCallBtn:', !!this.acceptCallBtn);
    console.log('   - declineCallBtn:', !!this.declineCallBtn);
    
    // Verificar si ya hay una llamada activa
    if (this.isCallActive) {
      console.log('📞 User busy, rejecting incoming call');
      // Enviar señal de ocupado
      this.emitCallSignal('call:busy', {
        callId: data.callId,
        to: data.from.userId,
        reason: 'user-busy'
      });
      return;
    }
    
    // Configurar datos de la llamada entrante
    this.callId = data.callId;
    this.currentContact = {
      userId: data.from.userId,
      name: data.from.name || data.from.username || 'Usuario desconocido',
      profilePhoto: data.from.profilePhoto || 'images/user-placeholder-40.svg',
      ...data.from
    };
    this.currentCallType = data.type;
    this.isInitiator = false;
    this.incomingOffer = data.offer;
    
    console.log('📞 Showing incoming call interface for:', this.currentContact.name);
    
    // Mostrar interfaz de llamada entrante INMEDIATAMENTE
    this.showIncomingCallInterface();
    
    // Actualizar información del contacto en la UI
    this.updateIncomingCallUI();
    
    // Reproducir sonido de llamada entrante
    this.playCallSound('incoming');
    console.log('🔊 Playing incoming ringtone for call from:', this.currentContact.name);
    
    // Mostrar notificación del sistema si está disponible
    this.showIncomingCallNotification();
    
    // Timeout para llamadas perdidas (30 segundos)
    this.incomingCallTimeout = setTimeout(() => {
      console.log('📞 Incoming call missed after 30 seconds');
      this.handleMissedIncomingCall();
    }, 30000);
    
    // Agregar mensaje de llamada entrante al chat
    this.addCallMessageToConversation('incoming', this.currentCallType, 'ringing');
    
    // Record incoming call start in history
    if (window.callHistoryManager) {
      window.callHistoryManager.recordIncomingCall(data.from, data.type);
    }
  }

  showIncomingCallInterface() {
    console.log('📞 ===== SHOWING INCOMING CALL INTERFACE =====');
    console.log('📞 Looking for incoming-call-interface element...');
    
    // Primero mostrar el modal principal de llamada
    const callModal = document.getElementById('call-modal');
    const incomingInterface = document.getElementById('incoming-call-interface');
    
    console.log('📞 Found call-modal:', !!callModal);
    console.log('📞 Found incoming-call-interface:', !!incomingInterface);
    
    if (callModal && incomingInterface) {
      // Mostrar el modal principal
      callModal.classList.add('active');
      callModal.style.display = 'flex';
      
      // Mostrar interfaz de llamada entrante
      incomingInterface.classList.add('active');
      incomingInterface.style.display = 'flex';
      
      // Agregar clase al body para estilos adicionales
      document.body.classList.add('call-active', 'incoming-call-active');
      
      console.log('📞 Classes after adding active:', incomingInterface.className);
      console.log('📞 Display style after:', window.getComputedStyle(incomingInterface).display);
      console.log('SUCCESS: Incoming call interface shown');
      
      // Force visibility check
      const isVisible = incomingInterface.offsetParent !== null;
      console.log('📞 Element is visible:', isVisible);
      
      // Try alternative showing method if not visible
      if (!isVisible) {
        console.log('⚠️ Element not visible, trying inline styles...');
        incomingInterface.style.display = 'flex';
        incomingInterface.style.position = 'fixed';
        incomingInterface.style.top = '0';
        incomingInterface.style.left = '0';
        incomingInterface.style.width = '100%';
        incomingInterface.style.height = '100%';
        incomingInterface.style.zIndex = '10001';
        incomingInterface.style.backgroundColor = 'rgba(0,0,0,0.9)';
        console.log('📞 Forced visibility with inline styles');
      }
    } else {
      console.error('ERROR: incoming-call-interface element not found in DOM');
      console.log('📞 Available elements with "call" in ID:');
      const callElements = document.querySelectorAll('[id*="call"]');
      callElements.forEach(el => {
        console.log(`   - ${el.id}: ${el.tagName}`);
      });
    }
  }
  
  hideIncomingCallInterface() {
    const incomingInterface = document.getElementById('incoming-call-interface');
    if (incomingInterface) {
      incomingInterface.classList.remove('active');
      document.body.classList.remove('call-active');
      console.log('🙈 Incoming call interface hidden');
    }
  }
  
  updateIncomingCallUI() {
    console.log('RENDER: Updating incoming call UI with contact info:', this.currentContact);
    
    // Actualizar nombre del contacto
    const nameElement = document.getElementById('incoming-contact-name');
    if (nameElement && this.currentContact) {
      nameElement.textContent = this.currentContact.name;
      console.log('SUCCESS: Updated contact name:', this.currentContact.name);
    } else {
      console.warn('WARN: Name element or contact info missing');
      console.log('WARN: nameElement exists:', !!nameElement);
      console.log('WARN: currentContact exists:', !!this.currentContact);
    }
    
    // Actualizar avatar del contacto
    const avatarElement = document.getElementById('incoming-contact-avatar');
    if (avatarElement && this.currentContact) {
      const avatarSrc = this.currentContact.profilePhoto || this.currentContact.avatar || 'images/user-placeholder-40.svg';
      avatarElement.src = avatarSrc;
      avatarElement.alt = this.currentContact.name;
      console.log('SUCCESS: Updated contact avatar:', avatarSrc);
    } else {
      console.warn('WARN: Avatar element or contact info missing');
      console.log('WARN: avatarElement exists:', !!avatarElement);
      console.log('WARN: currentContact exists:', !!this.currentContact);
    }
    
    // Actualizar tipo de llamada
    const typeElement = document.getElementById('incoming-call-type');
    if (typeElement) {
      const callTypeText = this.currentCallType === 'video' 
        ? `Videollamada entrante` 
        : `Llamada de voz entrante`;
      typeElement.textContent = callTypeText;
      console.log('SUCCESS: Updated call type:', callTypeText);
    }
  }
  
  showIncomingCallNotification() {
    try {
      // Solicitar permiso de notificaciones si no se ha concedido
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          const notification = new Notification(`Llamada entrante de ${this.currentContact.name}`, {
            body: this.currentCallType === 'video' ? 'Videollamada' : 'Llamada de voz',
            icon: this.currentContact.profilePhoto || 'images/user-placeholder-40.svg',
            badge: 'images/icon-192.png',
            requireInteraction: true,
            actions: [
              { action: 'accept', title: 'Aceptar' },
              { action: 'decline', title: 'Rechazar' }
            ]
          });
          
          notification.onclick = () => {
            window.focus();
            this.acceptCall();
            notification.close();
          };
          
          // Auto-close notification after call timeout
          setTimeout(() => {
            notification.close();
          }, 30000);
          
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              this.showIncomingCallNotification();
            }
          });
        }
      }
    } catch (error) {
      console.warn('Error showing notification:', error);
    }
  }
  
  async setupPeerConnectionForIncoming(offer) {
    try {
      // Get user media first
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: this.currentCallType === 'video' ? {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.localVideo) {
        this.localVideo.srcObject = this.localStream;
      }
      
      // Setup peer connection
      await this.setupPeerConnection();
      
      // Set remote description (offer)
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any queued ICE candidates
      while (this.candidatesQueue.length > 0) {
        const candidate = this.candidatesQueue.shift();
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
      
      console.log('SUCCESS: Incoming call setup completed');
      
    } catch (error) {
      console.error('ERROR: Error setting up incoming call:', error);
      this.showNotification('Error al configurar la llamada entrante', 'error');
      this.declineCall();
    }
  }

  handleMissedIncomingCall() {
    console.log('📞 Incoming call missed');
    
    // Stop incoming sound
    this.stopCallSound('incoming');
    
    // Send missed call signal
    this.emitCallSignal('call:missed', {
      callId: this.callId,
      to: this.currentContact.userId || this.currentContact.id
    });
    
    // Record as missed call
    if (this.currentContact) {
      const callData = {
        contactId: this.currentContact.userId || this.currentContact.id,
        contactName: this.currentContact.name || this.currentContact.username,
        contactAvatar: this.currentContact.profilePhoto,
        type: this.currentCallType
      };
      
      this.dispatchCallEvent('callMissed', callData);
      this.saveCallToHistory('missed');
      
      if (window.callHistoryManager) {
        window.callHistoryManager.recordMissedCall(callData, this.currentCallType);
      }
    }
    
    // Update call message
    this.updateCallMessageInConversation('missed');
    
    // Clean up
    this.hideCallInterface();
    this.resetState();
  }

  // Enhanced call event handlers
  async handleCallAccepted(data) {
    console.log('SUCCESS: Call accepted:', data);
    
    // Cancelar timeout de llamada sin respuesta
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
      console.log('SUCCESS: Call timeout cancelled - call was accepted');
    }
    
    if (!this.peerConnection) {
      console.error('No peer connection available');
      return;
    }
    
    try {
      // Stop outgoing ringtone
      this.stopCallSound('outgoing');
      
      // Set remote description (answer)
      if (data.answer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Remote description (answer) set successfully');
      }
      
      // Process any queued ICE candidates
      while (this.candidatesQueue.length > 0) {
        const candidate = this.candidatesQueue.shift();
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
      
      // Mantener estado conectado si ya se estableció la conexión
      if (this.connectionState !== 'connected') {
        this.updateCallInterface('connecting');
      }
      this.updateCallMessageInConversation('accepted');
      
    } catch (error) {
      console.error('Error handling call acceptance:', error);
      this.endCall('connection-error');
    }
  }

  handleCallDeclined(data) {
    console.log('ERROR: Call declined:', data);
    
    // Stop outgoing sound
    this.stopCallSound('outgoing');
    
    // Play declined sound (busy tone)
    this.playCallSound('ended');
    
    // Update UI with more descriptive message
    const userName = this.currentContact?.name || window.i18n?.t('common.user') || 'El usuario';
    this.updateCallStatus(window.i18n?.t('calls.call_declined_by', {name: userName}) || `${userName} rechazó la llamada`);
    this.updateCallMessageInConversation('declined');
    
    // Show WhatsApp-style notification
    window.Utils?.TranslatedNotifications?.error('notifications.call_declined', {name: userName}) || this.showNotification(`${userName} rechazó la llamada`, 'info');
    
    // Record in history
    this.saveCallToHistory('declined');
    
    // End call after showing status
    setTimeout(() => {
      this.endCall('declined');
    }, 3000); // Increased time to show message
  }

  handleCallBusy(data) {
    console.log('📞 User is busy:', data);
    
    // Stop outgoing sound
    this.stopCallSound('outgoing');
    
    // Play busy tone
    this.playCallSound('ended');
    
    // Update UI with translation
    this.updateCallStatus(window.i18n?.t('calls.user_busy') || 'Usuario ocupado');
    this.updateCallMessageInConversation('busy');
    
    // Show notification
    const userName = this.currentContact?.name || window.i18n?.t('common.user') || 'El usuario';
    window.Utils?.TranslatedNotifications?.info('notifications.user_busy', {name: userName}) || this.showNotification(`${userName} está ocupado`, 'info');
    
    // End call
    setTimeout(() => {
      this.endCall('busy');
    }, 3000);
  }

  async handleIceCandidate(data) {
    console.log('DEBUG: ICE candidate received:', {
      hasCandidate: !!data.candidate,
      hasPeerConnection: !!this.peerConnection,
      hasRemoteDescription: !!(this.peerConnection && this.peerConnection.remoteDescription),
      candidateData: data.candidate
    });
    
    if (!data.candidate) {
      console.warn('WARN: No candidate in ICE candidate data');
      return;
    }
    
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('SUCCESS: ICE candidate added successfully');
      } else {
        // Queue candidate if remote description not set yet
        this.candidatesQueue.push(data.candidate);
        console.log('INFO: ICE candidate queued (remote description not ready)');
      }
    } catch (error) {
      console.error('ERROR: Error adding ICE candidate:', error);
      console.error('ERROR: Candidate data:', data.candidate);
    }
  }

  handleCallEnded(data) {
    console.log('📞 Call ended by remote user:', data);
    
    // Update status with translation
    this.updateCallStatus(window.i18n?.t('calls.call_ended') || 'Llamada terminada');
    this.updateCallMessageInConversation('ended');
    
    // Show notification
    window.Utils?.TranslatedNotifications?.info('notifications.call_ended') || this.showNotification('Llamada terminada', 'info');
    
    // Save to history
    this.saveCallToHistory('ended');
    
    // End call
    this.endCall('remote-ended');
  }

  handleCallMissed(data) {
    console.log('📞 Call marked as missed:', data);
    
    // Update message and history for outgoing missed call
    this.updateCallMessageInConversation('missed');
    this.saveCallToHistory('missed');
    
    // End call
    this.endCall('missed');
  }

  // Add call message to conversation
  addCallMessageToConversation(direction, type, status) {
    if (!window.Chat || !window.Chat.currentConversation) {
      console.log('ERROR: No chat manager or current conversation available');
      return;
    }

    const currentUserId = this.getCurrentUserId();
    const recipientId = this.getRecipientId();
    
    // Create proper message structure compatible with chat system
    const callMessage = {
      _id: 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: 'call',
      content: {
        callType: type, // 'audio' or 'video'
        direction: direction, // 'outgoing' or 'incoming'
        status: status, // 'calling', 'answered', 'missed', 'declined', 'ended'
        duration: this.getCallDuration(),
        text: `${type === 'video' ? 'Videollamada' : 'Llamada'} ${direction === 'outgoing' ? 'saliente' : 'entrante'}`
      },
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      sender: direction === 'outgoing' ? 
        { _id: currentUserId, username: this.getCurrentUserName(), avatar: this.getCurrentUserAvatar() } : 
        { _id: recipientId, username: this.currentContact?.name || this.currentContact?.username, avatar: this.currentContact?.profilePhoto },
      from: direction === 'outgoing' ? currentUserId : recipientId,
      to: direction === 'outgoing' ? recipientId : currentUserId,
      conversation: window.Chat.currentConversation.conversationId || window.Chat.currentConversation._id,
      isCallMessage: true,
      status: 'delivered' // Set message as delivered
    };

    console.log('📞 Adding call message to conversation:', callMessage);

    // For outgoing calls, display immediately
    if (direction === 'outgoing') {
      // Use the chat system directly to render the message
      const messageElement = window.Chat.renderMessage(callMessage);
      if (messageElement) {
        console.log('SUCCESS: Call message rendered successfully');
        
        // Store reference for updates with the actual DOM element
        this.lastCallMessage = {
          id: callMessage._id,
          element: messageElement,
          data: callMessage
        };
      }
    }

    // For incoming calls, let the socket system handle message delivery
    if (direction === 'incoming') {
      // Emit call message to server for real-time delivery
      this.emitCallSignal('call_message', {
        message: callMessage,
        to: currentUserId,
        from: recipientId
      });
    }

    return callMessage;
  }

  updateCallMessageInConversation(status) {
    if (!this.lastCallMessage) {
      console.log('ERROR: No last call message to update');
      return;
    }

    console.log(`📞 Updating call message status to: ${status}`);

    // Use the stored element reference or find by message ID
    const messageElement = this.lastCallMessage.element || 
                          document.querySelector(`[data-message-id="${this.lastCallMessage.id}"]`);
                          
    if (messageElement) {
      console.log('📞 Found call message element to update');
      
      // Update the call data
      this.lastCallMessage.data.content.status = status;
      this.lastCallMessage.data.content.duration = this.getCallDuration();
      
      // Update status class on main message element
      messageElement.classList.remove('calling', 'answered', 'missed', 'declined', 'ended');
      messageElement.classList.add(status);
      
      // Update the call message content
      const statusElement = messageElement.querySelector('.call-message-status');
      const durationElement = messageElement.querySelector('.call-message-duration');
      
      if (statusElement) {
        statusElement.textContent = this.getCallStatusText(status, this.lastCallMessage.data.content.direction);
      }

      // Add or update duration if call ended and has duration
      if (status === 'ended' && this.getCallDuration() > 0) {
        const durationText = this.formatCallDuration(this.getCallDuration());
        
        if (durationElement) {
          durationElement.textContent = durationText;
        } else {
          // Create and add duration element
          const durationDiv = document.createElement('div');
          durationDiv.className = 'call-message-duration';
          durationDiv.textContent = durationText;
          const contentDiv = messageElement.querySelector('.call-message-content');
          if (contentDiv) {
            contentDiv.appendChild(durationDiv);
          }
        }
      }
      
      // Show call actions for ended/missed/declined calls
      if (['ended', 'missed', 'declined'].includes(status)) {
        const actionsContainer = messageElement.querySelector('.call-message-actions');
        if (!actionsContainer && window.Chat && window.Chat.shouldShowCallActions) {
          const callData = this.lastCallMessage.data.content;
          if (window.Chat.shouldShowCallActions(callData)) {
            const actionsHTML = window.Chat.createCallActions(callData);
            const wrapper = messageElement.querySelector('.call-message-wrapper');
            if (wrapper) {
              wrapper.insertAdjacentHTML('beforeend', actionsHTML);
            }
          }
        }
      }

      console.log('SUCCESS: Call message updated in DOM');
    } else {
      console.log('ERROR: Could not find call message element to update');
    }
  }

  getCallStatusText(status, direction) {
    switch (status) {
      case 'calling':
        return direction === 'outgoing' ? 'Llamando...' : 'Llamada entrante...';
      case 'answered':
        return 'Respondida';
      case 'missed':
        return direction === 'outgoing' ? 'Sin respuesta' : 'Perdida';
      case 'declined':
        return direction === 'outgoing' ? 'Rechazada' : 'Rechazada';
      case 'ended':
        return 'Finalizada';
      default:
        return status;
    }
  }

  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '';
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return remainingSeconds > 0 
      ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      : `${minutes}:00`;
  }

  formatCallDuration(seconds) {
    // Alias for formatDuration to maintain compatibility
    return this.formatDuration(seconds);
  }

  getCallDuration() {
    if (!this.callStartTime) return 0;
    return Math.floor((new Date() - this.callStartTime) / 1000);
  }

  getCurrentUserId() {
    return window.Utils?.Storage?.get('userId') || window.currentUserId || null;
  }

  getCurrentUserName() {
    const userData = window.Utils?.Storage?.get('userData');
    return userData?.fullName || userData?.username || 'Usuario';
  }

  getCurrentUserAvatar() {
    const userData = window.Utils?.Storage?.get('userData');
    return userData?.avatar || userData?.profilePhoto || null;
  }
  
  async checkContactStatus(userId) {
    try {
      return new Promise((resolve, reject) => {
        // Usar el nuevo sistema de verificación en tiempo real
        const socket = window.SocketManager?.socket || window.socket;
        
        if (!socket || !socket.connected) {
          console.warn('Socket not available for status check');
          resolve(null);
          return;
        }
        
        console.log(`🔍 Requesting real-time availability check for user: ${userId}`);
        
        // Timeout para la respuesta
        const timeout = setTimeout(() => {
          socket.off('call-availability-response', responseHandler);
          console.warn('Status check timeout');
          resolve(null);
        }, 5000);
        
        // Handler para la respuesta
        const responseHandler = (data) => {
          if (data.userId === userId) {
            clearTimeout(timeout);
            socket.off('call-availability-response', responseHandler);
            
            console.log(`SUCCESS: Availability response received:`, data);
            
            resolve({
              status: data.isAvailable ? 'online' : data.status,
              isAvailable: data.isAvailable,
              source: data.source,
              lastSeen: data.lastActivity || new Date(),
              connectionCount: data.connectionCount || 0,
              sessionCount: data.sessionCount || 0
            });
          }
        };
        
        socket.on('call-availability-response', responseHandler);
        
        // Enviar solicitud
        socket.emit('check-call-availability', { userId });
      });
      
    } catch (error) {
      console.warn('Error checking contact status:', error);
      return null;
    }
  }

  // Debug function to test socket listeners
  testSocketListeners() {
    console.log('🧪 Testing socket listeners...');
    const socket = window.SocketManager?.socket || window.socket;
    
    if (!socket) {
      console.error('ERROR: No socket available for testing');
      return;
    }
    
    console.log('🔍 Socket info:', {
      id: socket.id,
      connected: socket.connected,
      listeners: Object.keys(socket._callbacks || {})
    });
    
    // Test call:incoming listener manually
    const testCallData = {
      callId: 'test-call-' + Date.now(),
      type: 'audio',
      offer: { test: true },
      from: {
        userId: 'test-user',
        name: 'Test User',
        profilePhoto: 'test-avatar.png'
      }
    };
    
    console.log('🧪 Simulating incoming call with test data:', testCallData);
    this.handleIncomingCall(testCallData);
  }

  // Dispatch custom events for call history tracking
  dispatchCallEvent(eventName, data) {
    const event = new CustomEvent(eventName, { 
      detail: data,
      bubbles: true 
    });
    
    document.dispatchEvent(event);
    console.log(`📞 Event dispatched: ${eventName}`, data);
  }
}

// Initialize call manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.callManager = new CallManager();
  console.log('📞 Call Manager initialized');
  
  // Setup header call buttons after a short delay to ensure DOM is ready
  setTimeout(() => {
    setupHeaderCallButtons();
  }, 1000);
});

// Setup call buttons in chat header
function setupHeaderCallButtons() {
  const audioCallBtn = document.getElementById('audio-call-btn');
  const videoCallBtn = document.getElementById('video-call-btn');
  
  if (audioCallBtn) {
    audioCallBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('📞 Audio call button clicked');
      
      if (window.callManager) {
        window.callManager.initiateCall('audio');
      } else {
        console.error('ERROR: CallManager not available');
      }
    });
    console.log('SUCCESS: Audio call button listener attached');
  } else {
    console.warn('⚠️ Audio call button not found');
  }
  
  if (videoCallBtn) {
    videoCallBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('📹 Video call button clicked');
      
      if (window.callManager) {
        window.callManager.initiateCall('video');
      } else {
        console.error('ERROR: CallManager not available');
      }
    });
    console.log('SUCCESS: Video call button listener attached');
  } else {
    console.warn('⚠️ Video call button not found');
  }
  
  // Setup socket event listeners
  setupCallSocketListeners();
}

// Setup socket event listeners for call signaling
function setupCallSocketListeners() {
  const socket = window.SocketManager?.socket || window.socket;
  
  if (!socket) {
    console.warn('⚠️ Socket not available for call events, retrying in 2 seconds...');
    setTimeout(setupCallSocketListeners, 2000);
    return;
  }
  
  // Remove existing listeners to prevent duplicates
  const callEvents = [
    'call:incoming', 'call:accepted', 'call:declined', 'call:busy',
    'call:ended', 'call:missed', 'call:ice-candidate', 'call:failed'
  ];
  
  callEvents.forEach(event => {
    socket.removeAllListeners(event);
  });
  
  // Add new listeners
  socket.on('call:incoming', (data) => {
    console.log('📞 ===== INCOMING CALL EVENT RECEIVED =====');
    console.log('📞 Incoming call data:', data);
    console.log('📞 Socket ID that received call:', socket.id);
    console.log('📞 Current window.callManager exists:', !!window.callManager);
    console.log('📞 Current call active:', window.callManager?.isCallActive);
    console.log('📞 ==========================================');
    
    if (window.callManager) {
      console.log('SUCCESS: Passing call to callManager.handleIncomingCall');
      window.callManager.handleIncomingCall(data);
    } else {
      console.error('ERROR: window.callManager not available!');
    }
  });
  
  socket.on('call:accepted', (data) => {
    console.log('SUCCESS: Call accepted:', data);
    if (window.callManager) {
      window.callManager.handleCallAccepted(data);
    }
  });
  
  socket.on('call:declined', (data) => {
    console.log('ERROR: Call declined:', data);
    if (window.callManager) {
      window.callManager.handleCallDeclined(data);
    }
  });
  
  socket.on('call:busy', (data) => {
    console.log('📞 User busy:', data);
    if (window.callManager) {
      window.callManager.handleCallBusy(data);
    }
  });
  
  socket.on('call:ended', (data) => {
    console.log('📞 Call ended by remote:', data);
    if (window.callManager) {
      window.callManager.handleCallEnded(data);
    }
  });
  
  socket.on('call:missed', (data) => {
    console.log('📞 Call missed:', data);
    if (window.callManager) {
      window.callManager.handleCallMissed(data);
    }
  });
  
  socket.on('call:ice-candidate', (data) => {
    if (window.callManager) {
      window.callManager.handleIceCandidate(data);
    }
  });
  
  socket.on('call:failed', (data) => {
    console.error('ERROR: Call failed:', data);
    if (window.callManager) {
      // Mensajes más específicos según la razón del fallo
      let message = 'Error en la llamada';
      switch (data.reason) {
        case 'user-offline':
          message = `${window.callManager.currentContact?.name || 'El usuario'} no está disponible en este momento`;
          break;
        case 'user-busy':
          message = `${window.callManager.currentContact?.name || 'El usuario'} está ocupado`;
          break;
        case 'server-error':
          message = 'Error del servidor. Inténtalo de nuevo';
          break;
        case 'connection-failed':
          message = 'No se pudo establecer la conexión';
          break;
        default:
          message = data.message || 'Error en la llamada';
      }
      
      window.callManager.showNotification(message, 'error');
      window.callManager.endCall('failed');
    }
  });
  
  console.log('SUCCESS: Call socket event listeners configured');
}

// Export for global access
if (typeof window !== 'undefined') {
  window.setupHeaderCallButtons = setupHeaderCallButtons;
  window.setupCallSocketListeners = setupCallSocketListeners;
}