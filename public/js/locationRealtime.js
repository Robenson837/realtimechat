// LocationRealTimeManager - Sistema de ubicación en tiempo real
class LocationRealTimeManager {
  constructor(chatManager) {
    this.chatManager = chatManager;
    this.socket = null;
    this.watchId = null;
    this.currentRoom = null;
    this.isSharing = false;
    this.shareInterval = null;
    this.realtimeSessions = new Map();
  }

  // Iniciar compartir ubicación en tiempo real
  async startRealtimeLocationSharing(duration = 3600) { // 1 hora por defecto
    console.log('🔴 Starting realtime location sharing...');
    
    if (!navigator.geolocation) {
      this.chatManager.showLocationError(
        'Geolocalización no soportada',
        'Tu navegador no soporta la función de ubicación en tiempo real.'
      );
      return;
    }

    // Verificar que hay una conversación activa
    if (!this.chatManager.currentConversation) {
      Utils.Notifications.error('Selecciona una conversación primero');
      return;
    }

    // Verificar permisos
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({name: 'geolocation'});
        if (permission.state === 'denied') {
          this.chatManager.showLocationError(
            'Permisos bloqueados',
            'Permite el acceso a la ubicación en la configuración del navegador.'
          );
          return;
        }
      }
    } catch (e) {
      console.log('Permissions API not available');
    }

    // Mostrar modal de selección de duración
    this.showDurationSelector(duration);
  }

  showDurationSelector(defaultDuration) {
    const modal = document.createElement('div');
    modal.id = 'realtime-location-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white; border-radius: 16px; padding: 24px;
        max-width: 380px; width: 90%;
      ">
        <h3 style="margin: 0 0 20px 0; color: #1C1C1E; font-size: 20px;">
          <i class="fas fa-broadcast-tower" style="color: #FF3B30; margin-right: 8px;"></i>
          Compartir ubicación en tiempo real
        </h3>
        
        <p style="color: #666; margin: 0 0 20px 0; font-size: 14px;">
          Tu ubicación se actualizará automáticamente cada 5 segundos
        </p>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">
            Duración:
          </label>
          <select id="duration-select" style="
            width: 100%; padding: 12px; border: 1px solid #ddd;
            border-radius: 8px; font-size: 16px;
          ">
            <option value="900">15 minutos</option>
            <option value="1800">30 minutos</option>
            <option value="3600" selected>1 hora</option>
            <option value="7200">2 horas</option>
            <option value="28800">8 horas</option>
          </select>
        </div>
        
        <div style="
          background: #FFF3CD; border: 1px solid #FFE69C;
          border-radius: 8px; padding: 12px; margin-bottom: 20px;
        ">
          <i class="fas fa-info-circle" style="color: #856404; margin-right: 6px;"></i>
          <span style="color: #856404; font-size: 13px;">
            El contacto podrá ver tu ubicación actualizada en tiempo real
          </span>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <button onclick="document.getElementById('realtime-location-modal').remove()" style="
            flex: 1; padding: 12px; background: #F2F2F7; color: #666;
            border: none; border-radius: 10px; cursor: pointer;
          ">
            Cancelar
          </button>
          <button id="start-sharing-btn" style="
            flex: 2; padding: 12px; background: #FF3B30; color: white;
            border: none; border-radius: 10px; cursor: pointer; font-weight: 600;
          ">
            <i class="fas fa-play" style="margin-right: 6px;"></i>
            Comenzar a compartir
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listener para comenzar
    document.getElementById('start-sharing-btn').addEventListener('click', () => {
      const duration = parseInt(document.getElementById('duration-select').value);
      modal.remove();
      this.initializeRealtimeSharing(duration);
    });
  }

  async initializeRealtimeSharing(duration) {
    this.isSharing = true;
    
    // Usar el socket existente de SocketManager
    this.socket = window.SocketManager?.socket;
    if (!this.socket || !this.socket.connected) {
      Utils.Notifications.error('Sin conexión al servidor');
      return;
    }
    
    // Obtener recipientId usando la misma lógica que sendLocationMessage
    let recipientId = null;
    if (this.chatManager.currentConversation.participant && this.chatManager.currentConversation.participant._id) {
      recipientId = this.chatManager.currentConversation.participant._id;
    } else if (this.chatManager.currentConversation._id) {
      recipientId = this.chatManager.currentConversation._id;
    } else if (this.chatManager.currentConversation.id) {
      recipientId = this.chatManager.currentConversation.id;
    } else if (this.chatManager.currentConversation.userId) {
      recipientId = this.chatManager.currentConversation.userId;
    }

    if (!recipientId) {
      Utils.Notifications.error('Error: No se pudo determinar el destinatario');
      return;
    }
    
    // Crear room único para esta sesión
    this.currentRoom = `location_${this.chatManager.currentUser._id}_${recipientId}_${Date.now()}`;
    
    // Notificar al servidor que comenzamos a compartir (usando el protocolo existente)
    this.socket.emit('start-sharing-location', {
      targetUserId: recipientId,
      duration: duration,
      roomId: this.currentRoom
    });
    
    // Configurar tracking de ubicación
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };
    
    // Usar watchPosition para actualizaciones continuas
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );
    
    // También enviar actualizaciones cada 5 segundos como respaldo
    this.shareInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => console.error('Interval location error:', error),
        options
      );
    }, 5000);
    
    // Mostrar indicador de compartiendo
    this.showSharingIndicator(duration);
    
    // Programar detención automática
    setTimeout(() => {
      this.stopRealtimeSharing();
    }, duration * 1000);
    
    // Escuchar eventos del servidor
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // Escuchar actualizaciones de ubicación de otros
    this.socket.on('location-update', (data) => {
      this.displayRemoteLocation(data);
    });

    // Escuchar cuando alguien deja de compartir
    this.socket.on('location-sharing-stopped', (data) => {
      this.handleRemoteSharingStopped(data);
    });
  }

  async handleLocationUpdate(position) {
    if (!this.isSharing || !this.socket?.connected) return;
    
    const { latitude, longitude, accuracy } = position.coords;
    
    // Obtener dirección actual
    const address = await this.chatManager.reverseGeocode(latitude, longitude);
    
    // Emitir actualización al servidor usando el protocolo existente
    this.socket.emit('update-location', {
      roomId: this.currentRoom,
      latitude,
      longitude,
      accuracy,
      address: address?.formatted || 'Ubicación desconocida',
      timestamp: Date.now()
    });
    
    // Actualizar UI local
    this.updateLocalSharingUI(latitude, longitude, address?.formatted);
  }

  handleLocationError(error) {
    console.error('Location error during realtime sharing:', error);
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        this.stopRealtimeSharing();
        this.chatManager.showLocationError(
          'Permisos denegados',
          'Se perdió el acceso a la ubicación. El compartido se ha detenido.'
        );
        break;
      case error.POSITION_UNAVAILABLE:
        Utils.Notifications.error('Ubicación temporalmente no disponible');
        break;
      case error.TIMEOUT:
        console.log('Location timeout, retrying...');
        break;
    }
  }

  showSharingIndicator(duration) {
    // Crear indicador flotante
    const indicator = document.createElement('div');
    indicator.id = 'location-sharing-indicator';
    indicator.style.cssText = `
      position: fixed; top: 80px; right: 20px;
      background: #FF3B30; color: white;
      padding: 12px 16px; border-radius: 24px;
      display: flex; align-items: center; gap: 10px;
      box-shadow: 0 4px 12px rgba(255,59,48,0.3);
      z-index: 9999; cursor: pointer;
      animation: pulse 2s infinite;
    `;
    
    const endTime = Date.now() + (duration * 1000);
    
    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      indicator.innerHTML = `
        <div style="
          width: 8px; height: 8px; background: white;
          border-radius: 50%; animation: blink 1s infinite;
        "></div>
        <span style="font-size: 14px; font-weight: 500;">
          Compartiendo ubicación ${minutes}:${seconds.toString().padStart(2, '0')}
        </span>
        <i class="fas fa-times" style="cursor: pointer;" onclick="window.locationRealtime.stopRealtimeSharing()"></i>
      `;
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
        this.stopRealtimeSharing();
      }
    };
    
    document.body.appendChild(indicator);
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    
    // Añadir animaciones CSS si no existen
    if (!document.getElementById('location-animations')) {
      const style = document.createElement('style');
      style.id = 'location-animations';
      style.innerHTML = `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  updateLocalSharingUI(lat, lng, address) {
    // Actualizar el indicador con la dirección actual
    const indicator = document.getElementById('location-sharing-indicator');
    if (indicator && address) {
      const addressSpan = indicator.querySelector('.current-address');
      if (!addressSpan) {
        // Añadir elemento de dirección si no existe
        const addressElement = document.createElement('div');
        addressElement.className = 'current-address';
        addressElement.style.cssText = 'font-size: 11px; opacity: 0.8; margin-top: 2px;';
        addressElement.textContent = address;
        indicator.querySelector('span').appendChild(addressElement);
      } else {
        addressSpan.textContent = address;
      }
    }
  }

  displayRemoteLocation(data) {
    const { userId, latitude, longitude, address, timestamp } = data;
    
    // Crear o actualizar mensaje de ubicación en tiempo real
    const messageId = `realtime-location-${userId}`;
    let messageElement = document.getElementById(messageId);
    
    if (!messageElement) {
      // Crear nuevo elemento de mensaje
      messageElement = document.createElement('div');
      messageElement.id = messageId;
      messageElement.className = 'message realtime-location';
      
      // Insertar en el chat
      const messagesContainer = document.querySelector('.messages-scroll');
      if (messagesContainer) {
        messagesContainer.appendChild(messageElement);
      }
    }
    
    // Actualizar contenido
    const timeAgo = this.getTimeAgo(timestamp);
    messageElement.innerHTML = `
      <div style="
        background: #E8F5E9; border-radius: 12px; padding: 12px;
        border-left: 4px solid #4CAF50; margin: 8px 0;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="
            width: 10px; height: 10px; background: #4CAF50;
            border-radius: 50%; margin-right: 8px;
            animation: blink 1s infinite;
          "></div>
          <span style="font-weight: 600; color: #2E7D32;">
            Ubicación en tiempo real
          </span>
          <span style="margin-left: auto; font-size: 12px; color: #666;">
            ${timeAgo}
          </span>
        </div>
        
        <div style="
          background: white; border-radius: 8px; padding: 8px;
          margin-bottom: 8px;
        ">
          <i class="fas fa-map-marker-alt" style="color: #FF5722; margin-right: 6px;"></i>
          <span style="color: #333;">${address}</span>
        </div>
        
        <button onclick="window.locationRealtime.openMapView(${latitude}, ${longitude})" style="
          width: 100%; padding: 8px; background: #4CAF50; color: white;
          border: none; border-radius: 6px; cursor: pointer;
          font-weight: 500;
        ">
          <i class="fas fa-map" style="margin-right: 6px;"></i>
          Ver en mapa
        </button>
      </div>
    `;
    
    // Auto-scroll al último mensaje
    this.chatManager.scrollToBottom();
  }

  stopRealtimeSharing() {
    console.log('🛑 Stopping realtime location sharing');
    
    this.isSharing = false;
    
    // Detener tracking
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    // Detener intervalo
    if (this.shareInterval) {
      clearInterval(this.shareInterval);
      this.shareInterval = null;
    }
    
    // Notificar al servidor usando el protocolo existente
    if (this.socket && this.currentRoom) {
      this.socket.emit('stop-sharing-location', this.currentRoom);
    }
    
    // Remover indicador
    const indicator = document.getElementById('location-sharing-indicator');
    if (indicator) indicator.remove();
    
    // Mostrar notificación
    Utils.Notifications.success('Dejaste de compartir tu ubicación');
  }

  handleRemoteSharingStopped(data) {
    const { userId } = data;
    
    // Remover mensaje de ubicación en tiempo real
    const messageElement = document.getElementById(`realtime-location-${userId}`);
    if (messageElement) {
      messageElement.remove();
    }
    
    // Mostrar notificación
    Utils.Notifications.info('El contacto dejó de compartir su ubicación');
  }

  openMapView(lat, lng) {
    // Usar la función existente del chatManager
    this.chatManager.openLocationMap(lat, lng, 'Ubicación en tiempo real');
  }

  getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'Ahora mismo';
    if (seconds < 60) return `Hace ${seconds} segundos`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'Hace más de una hora';
  }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  // Esperar a que ChatManager esté disponible
  const initLocationRealtime = () => {
    if (window.chatManager) {
      window.locationRealtime = new LocationRealTimeManager(window.chatManager);
      console.log('✅ LocationRealTimeManager initialized');
    } else {
      setTimeout(initLocationRealtime, 500); // Reintentar en 500ms
    }
  };
  
  initLocationRealtime();
});

// También inicializar si ChatManager ya existe
if (typeof window !== 'undefined' && window.chatManager) {
  window.locationRealtime = new LocationRealTimeManager(window.chatManager);
}