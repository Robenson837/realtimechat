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
    
    // Call sounds
    this.callSounds = {
      outgoing: null,
      incoming: null,
      connected: null,
      ended: null
    };
    this.currentRingtone = null;
    
    // ICE servers configuration (STUN servers)
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
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
      
      console.log('📞 Call sounds initialized');
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
        
        console.log(`🎵 Playing tone: ${frequencies}Hz`);
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
        
        console.log('🔇 Stopped tone playback');
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
    console.log(`🔥 Iniciando llamada ${type}...`);
    
    if (!window.chatManager || !window.chatManager.currentConversation) {
      this.showNotification('Selecciona una conversación primero', 'error');
      return;
    }

    this.currentCallType = type;
    this.currentContact = window.chatManager.currentConversation;
    
    try {
      // Setup local stream
      await this.setupLocalStream(type);
      
      // Show call interface
      this.showCallInterface();
      
      // Setup peer connection
      await this.setupPeerConnection();
      
      // Update UI for outgoing call
      this.updateCallInterface('outgoing');
      
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
      
      // Emit call signal to server
      this.emitCallSignal('call_request', {
        to: this.getRecipientId(),
        type: type,
        offer: await this.createOffer(),
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
      this.showNotification('Error al iniciar la llamada', 'error');
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
    
    console.log(`📹 Stream local configurado para llamada ${type}`);
  }

  async setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceServers);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('🎯 Remote track recibido');
      this.remoteStream = event.streams[0];
      if (this.remoteVideo) {
        this.remoteVideo.srcObject = this.remoteStream;
      }
      this.updateCallInterface('connected');
    };
    
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitCallSignal('ice_candidate', {
          to: this.getRecipientId(),
          candidate: event.candidate
        });
      }
    };
    
    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', this.peerConnection.connectionState);
      
      switch (this.peerConnection.connectionState) {
        case 'connected':
          this.updateCallStatus('Conectado');
          break;
        case 'disconnected':
        case 'failed':
          this.updateCallStatus('Conexión perdida');
          setTimeout(() => this.endCall(), 3000);
          break;
        case 'closed':
          this.endCall();
          break;
      }
    };
  }

  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer() {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  showCallInterface() {
    if (this.callModal) {
      this.callModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    
    // Hide incoming call interface
    if (this.incomingCallInterface) {
      this.incomingCallInterface.classList.remove('active');
    }
  }

  hideCallInterface() {
    if (this.callModal) {
      this.callModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  updateCallInterface(state) {
    // Update contact info
    if (this.currentContact) {
      const contactName = this.currentContact.name || this.currentContact.username || 'Usuario';
      const contactAvatar = this.currentContact.profilePhoto || 'images/user-placeholder-40.svg';
      
      if (this.callContactName) this.callContactName.textContent = contactName;
      if (this.callContactAvatar) this.callContactAvatar.src = contactAvatar;
      if (this.audioContactAvatar) this.audioContactAvatar.src = contactAvatar;
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
    
    // Update status based on state
    switch (state) {
      case 'outgoing':
        this.updateCallStatus('Llamando...');
        break;
      case 'incoming':
        this.updateCallStatus('Llamada entrante');
        break;
      case 'connecting':
        this.updateCallStatus('Conectando...');
        break;
      case 'connected':
        this.updateCallStatus('Conectado');
        break;
    }
  }

  updateCallStatus(status) {
    if (this.callStatus) {
      this.callStatus.textContent = status;
    }
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
          this.toggleAudioBtn.title = 'Silenciar micrófono';
        } else {
          this.toggleAudioBtn.classList.add('muted');
          this.toggleAudioBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
          this.toggleAudioBtn.title = 'Activar micrófono';
        }
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
          this.toggleVideoBtn.title = 'Desactivar video';
        } else {
          this.toggleVideoBtn.classList.add('disabled');
          this.toggleVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
          this.toggleVideoBtn.title = 'Activar video';
        }
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
      
      console.log(`📹 Cámara cambiada a: ${this.facingMode}`);
      
    } catch (error) {
      console.error('Error cambiando cámara:', error);
      this.showNotification('Error al cambiar cámara', 'error');
    }
  }

  toggleSpeaker() {
    // This is a UI indicator - actual speaker control depends on device
    this.isSpeakerEnabled = !this.isSpeakerEnabled;
    
    if (this.toggleSpeakerBtn) {
      if (this.isSpeakerEnabled) {
        this.toggleSpeakerBtn.classList.add('active');
        this.toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        this.toggleSpeakerBtn.title = 'Desactivar altavoz';
      } else {
        this.toggleSpeakerBtn.classList.remove('active');
        this.toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        this.toggleSpeakerBtn.title = 'Activar altavoz';
      }
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

  endCall() {
    console.log('📞 Finalizando llamada...');
    
    // Emit call ended event before resetting state
    if (this.isCallActive && this.currentContact) {
      this.dispatchCallEvent('callEnded', {
        contactId: this.getRecipientId(),
        contactName: this.currentContact.name || this.currentContact.username,
        contactAvatar: this.currentContact.profilePhoto,
        type: this.currentCallType,
        direction: 'outgoing' // This could be improved to track actual direction
      });
    }
    
    // Stop streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Clear video elements
    if (this.localVideo) this.localVideo.srcObject = null;
    if (this.remoteVideo) this.remoteVideo.srcObject = null;
    
    // Stop timer
    this.stopCallTimer();
    
    // Hide interface
    this.hideCallInterface();
    
    // Notify remote peer
    if (this.isCallActive) {
      this.emitCallSignal('call_ended', {
        to: this.getRecipientId()
      });
    }
    
    // Reset state
    this.isCallActive = false;
    this.currentCallType = null;
    this.currentContact = null;
    this.isVideoEnabled = true;
    this.isAudioEnabled = true;
    this.isSpeakerEnabled = false;
    this.facingMode = 'user';
    
    // Reset button states
    this.resetButtonStates();
    
    // Clear any call timeout
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }
    
    // Stop any playing sounds
    this.stopAllCallSounds();
    
    console.log('✅ Llamada finalizada');
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

  acceptCall() {
    console.log('📞 Aceptando llamada...');
    
    // Clear incoming call timeout
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }
    
    // Stop incoming sound
    this.stopCallSound('incoming');
    
    // Play connected sound
    this.playCallSound('connected');
    
    // Hide incoming interface and show call interface
    if (this.incomingCallInterface) {
      this.incomingCallInterface.classList.remove('active');
    }
    
    this.updateCallInterface('connected');
    this.isCallActive = true;
    this.startCallTimer();
    
    // Update call message status
    this.updateCallMessageInConversation('answered');
    
    // Emit acceptance signal
    this.emitCallSignal('call_accepted', {
      to: this.currentContact.userId || this.currentContact.id
    });
  }

  declineCall() {
    console.log('📞 Rechazando llamada...');
    
    // Clear incoming call timeout
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }
    
    // Stop incoming sound
    this.stopCallSound('incoming');
    
    // Update call message status
    this.updateCallMessageInConversation('declined');
    
    // Emit decline signal
    if (this.currentContact) {
      this.emitCallSignal('call_declined', {
        to: this.currentContact.userId || this.currentContact.id
      });
    }
    
    // Hide interface and reset
    this.hideCallInterface();
    this.resetState();
  }

  resetState() {
    this.isCallActive = false;
    this.currentCallType = null;
    this.currentContact = null;
    this.isVideoEnabled = true;
    this.isAudioEnabled = true;
    this.isSpeakerEnabled = false;
    this.facingMode = 'user';
    
    // Clear timeouts
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
    
    // Reset button states
    this.resetButtonStates();
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
    // Get the current conversation recipient ID
    if (window.chatManager && window.chatManager.currentConversation) {
      return window.chatManager.getRecipientId();
    }
    return null;
  }

  emitCallSignal(event, data) {
    // Emit call signaling through socket.io
    const socket = window.SocketManager?.socket || window.socket;
    if (socket && socket.connected) {
      console.log(`🚀 Emitiendo señal: ${event}`, {
        ...data,
        timestamp: new Date().toISOString(),
        socketId: socket.id
      });
      
      // Add current user info if not present
      if (!data.from && event === 'call_request') {
        data.from = {
          userId: this.getCurrentUserId(),
          name: this.getCurrentUserName(),
          profilePhoto: this.getCurrentUserAvatar()
        };
      }
      
      socket.emit(event, data);
      
      // Add acknowledgment callback for important events
      if (['call_request', 'call_accepted', 'call_declined'].includes(event)) {
        setTimeout(() => {
          console.log(`✅ Signal ${event} sent successfully`);
        }, 100);
      }
    } else {
      console.error('❌ Socket.io no disponible para señalización', {
        hasSocketManager: !!window.SocketManager,
        hasSocket: !!socket,
        isConnected: socket?.connected
      });
      this.showNotification('Error de conexión. Verifica tu conexión a internet.', 'error');
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

  // Public methods for socket.io integration
  handleIncomingCall(data) {
    console.log('📞 Llamada entrante:', data);
    this.currentContact = data.from;
    this.currentCallType = data.type;
    
    // Show incoming call interface
    if (this.incomingCallInterface) {
      this.incomingCallInterface.classList.add('active');
    }
    
    this.showCallInterface();
    this.updateCallInterface('incoming');
    
    // Play incoming call sound (only for the receiver)
    this.playCallSound('incoming');
    console.log('🔊 Playing INCOMING sound for receiver');
    
    // Set timeout for missed calls (30 seconds)
    this.incomingCallTimeout = setTimeout(() => {
      console.log('📞 Llamada entrante perdida después de 30 segundos');
      this.handleMissedIncomingCall();
    }, 30000);
    
    // Update incoming call info
    if (this.incomingContactName) {
      this.incomingContactName.textContent = data.from.name || data.from.username || 'Usuario';
    }
    
    if (this.incomingContactAvatar) {
      this.incomingContactAvatar.src = data.from.profilePhoto || 'images/user-placeholder-40.svg';
    }
    
    if (this.incomingCallType) {
      this.incomingCallType.textContent = data.type === 'video' ? 'Videollamada entrante' : 'Llamada entrante';
    }
    
    // Add incoming call message to conversation
    this.addCallMessageToConversation('incoming', data.type, 'calling');
    
    // Record incoming call start in history
    if (window.callHistoryManager) {
      window.callHistoryManager.recordIncomingCall(data.from, data.type);
    }
  }

  handleMissedIncomingCall() {
    console.log('📞 Llamada entrante perdida');
    
    // Stop incoming sound
    this.stopCallSound('incoming');
    
    // Record as missed call
    if (this.currentContact) {
      const callData = {
        contactId: this.currentContact.userId || this.currentContact.id,
        contactName: this.currentContact.name || this.currentContact.username,
        contactAvatar: this.currentContact.profilePhoto,
        type: this.currentCallType
      };
      
      // Dispatch missed call event
      this.dispatchCallEvent('callMissed', callData);
      
      // Record in history manager as missed
      if (window.callHistoryManager) {
        window.callHistoryManager.recordMissedCall(callData, this.currentCallType);
      }
    }
    
    // Hide call interface
    this.hideCallInterface();
    this.resetState();
  }

  async handleCallAnswer(data) {
    console.log('📞 Respuesta de llamada recibida:', data);
    
    if (this.peerConnection && data.answer) {
      await this.peerConnection.setRemoteDescription(data.answer);
      this.updateCallInterface('connected');
    }
  }

  async handleCallOffer(data) {
    console.log('📞 Oferta de llamada recibida:', data);
    
    if (this.peerConnection && data.offer) {
      await this.peerConnection.setRemoteDescription(data.offer);
      const answer = await this.createAnswer();
      
      this.emitCallSignal('call_answer', {
        to: this.getRecipientId(),
        answer: answer
      });
    }
  }

  handleIceCandidate(data) {
    console.log('🧊 ICE candidate recibido:', data);
    
    if (this.peerConnection && data.candidate) {
      this.peerConnection.addIceCandidate(data.candidate);
    }
  }

  handleCallEnded(data) {
    console.log('📞 Llamada terminada por el otro usuario');
    this.endCall();
  }

  // Add call message to conversation
  addCallMessageToConversation(direction, type, status) {
    if (!window.Chat || !window.Chat.currentConversation) {
      console.log('❌ No chat manager or current conversation available');
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
        console.log('✅ Call message rendered successfully');
        
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
      console.log('❌ No last call message to update');
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

      console.log('✅ Call message updated in DOM');
    } else {
      console.log('❌ Could not find call message element to update');
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
  console.log('📞 Call Manager inicializado');
});