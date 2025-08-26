/**
 * Call Messages Renderer
 * Handles rendering call messages in conversations
 * Integrates with chat.js to display call history inline
 */

class CallMessagesRenderer {
  constructor() {
    this.setupEventListeners();
    console.log('📞 Call Messages Renderer initialized');
  }

  setupEventListeners() {
    // Listen for call message events from call manager
    document.addEventListener('callMessageAdded', (e) => {
      this.handleCallMessageAdded(e.detail);
    });

    document.addEventListener('callMessageUpdated', (e) => {
      this.handleCallMessageUpdated(e.detail);
    });
  }

  handleCallMessageAdded(callData) {
    console.log('📞 Adding call message to conversation:', callData);
    
    if (!window.chatManager || !window.chatManager.currentConversation) {
      return;
    }

    // Create call message element
    const messageElement = this.createCallMessageElement(callData);
    
    // Add to messages container
    const messagesScroll = document.getElementById('messages-scroll');
    if (messagesScroll) {
      messagesScroll.appendChild(messageElement);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesScroll.scrollTop = messagesScroll.scrollHeight;
      }, 100);
    }

    // Store reference for updates
    this.lastCallMessage = {
      element: messageElement,
      data: callData
    };
  }

  handleCallMessageUpdated(callData) {
    console.log('📞 Updating call message:', callData);
    
    if (!this.lastCallMessage) return;

    // Update the last call message
    const updatedElement = this.createCallMessageElement({
      ...this.lastCallMessage.data,
      status: callData.status,
      duration: callData.duration
    });

    // Replace the element
    if (this.lastCallMessage.element && this.lastCallMessage.element.parentNode) {
      this.lastCallMessage.element.parentNode.replaceChild(updatedElement, this.lastCallMessage.element);
      this.lastCallMessage.element = updatedElement;
    }
  }

  createCallMessageElement(callData) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `call-message ${callData.direction} ${callData.status}`;
    
    const iconClass = this.getCallIconClass(callData);
    const statusText = this.getCallStatusText(callData);
    const typeText = callData.callType === 'video' ? 'Videollamada' : 'Llamada';
    const durationText = this.formatDuration(callData.duration);

    messageDiv.innerHTML = `
      <div class="call-message-icon ${callData.direction} ${callData.status}">
        <i class="${iconClass}"></i>
      </div>
      <div class="call-message-content">
        <div class="call-message-type">
          ${typeText}
          <i class="fas fa-${callData.callType === 'video' ? 'video' : 'phone'}"></i>
        </div>
        <div class="call-message-status">
          ${statusText}
        </div>
        ${callData.duration > 0 ? `<div class="call-message-duration">${durationText}</div>` : ''}
      </div>
      ${this.shouldShowCallActions(callData) ? this.createCallActions(callData) : ''}
    `;

    // Add click handler for call back
    if (this.shouldShowCallActions(callData)) {
      const callBtn = messageDiv.querySelector('.call-message-action-btn:not(.video)');
      const videoBtn = messageDiv.querySelector('.call-message-action-btn.video');
      
      if (callBtn) {
        callBtn.addEventListener('click', () => {
          if (window.callManager) {
            window.callManager.initiateCall('audio');
          }
        });
      }
      
      if (videoBtn) {
        videoBtn.addEventListener('click', () => {
          if (window.callManager) {
            window.callManager.initiateCall('video');
          }
        });
      }
    }

    return messageDiv;
  }

  getCallIconClass(callData) {
    const baseIcon = callData.callType === 'video' ? 'video' : 'phone';
    
    switch (callData.status) {
      case 'missed':
      case 'declined':
        return `fas fa-${baseIcon}-slash`;
      case 'calling':
        return `fas fa-${baseIcon} fa-pulse`;
      default:
        return `fas fa-${baseIcon}`;
    }
  }

  getCallStatusText(callData) {
    const direction = callData.direction === 'outgoing' ? 'Saliente' : 'Entrante';
    
    switch (callData.status) {
      case 'calling':
        return callData.direction === 'outgoing' ? 'Llamando...' : 'Llamada entrante...';
      case 'answered':
        return 'Respondida';
      case 'missed':
        return callData.direction === 'outgoing' ? 'Sin respuesta' : 'Perdida';
      case 'declined':
        return callData.direction === 'outgoing' ? 'Rechazada' : 'Rechazada';
      case 'ended':
        return 'Finalizada';
      default:
        return `${direction}`;
    }
  }

  shouldShowCallActions(callData) {
    // Show call back buttons only for ended, missed, or declined calls
    return ['ended', 'missed', 'declined'].includes(callData.status);
  }

  createCallActions(callData) {
    return `
      <div class="call-message-actions">
        <button class="call-message-action-btn" title="Llamar">
          <i class="fas fa-phone"></i>
        </button>
        <button class="call-message-action-btn video" title="Videollamada">
          <i class="fas fa-video"></i>
        </button>
      </div>
    `;
  }

  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '';
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 
        ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
        : `${minutes}:00`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Clear call message reference when conversation changes
  clearLastCallMessage() {
    this.lastCallMessage = null;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.callMessagesRenderer = new CallMessagesRenderer();
  
  // Clear reference when conversation changes
  document.addEventListener('conversationChanged', () => {
    if (window.callMessagesRenderer) {
      window.callMessagesRenderer.clearLastCallMessage();
    }
  });
});