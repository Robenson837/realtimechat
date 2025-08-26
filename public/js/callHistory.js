/**
 * Call History Manager
 * Manages call history display and storage
 * Integrates with the calls tab and provides call statistics
 */

class CallHistoryManager {
  constructor() {
    this.callHistory = [];
    this.maxHistoryItems = 50;
    this.callsListElement = null;
    this.emptyStateElement = null;
    
    this.initializeElements();
    this.loadCallHistory();
    this.bindEvents();
  }

  initializeElements() {
    this.callsListElement = document.getElementById('calls-list');
    this.emptyStateElement = this.callsListElement?.querySelector('.empty-calls-state');
    
    console.log('📞 Call History Manager initialized');
  }

  bindEvents() {
    // Listen for call events from call manager
    document.addEventListener('callStarted', (e) => this.handleCallStarted(e.detail));
    document.addEventListener('callEnded', (e) => this.handleCallEnded(e.detail));
    document.addEventListener('callMissed', (e) => this.handleCallMissed(e.detail));
  }

  loadCallHistory() {
    try {
      const savedHistory = localStorage.getItem('callHistory');
      if (savedHistory) {
        this.callHistory = JSON.parse(savedHistory);
        this.renderCallHistory();
      }
    } catch (error) {
      console.error('Error loading call history:', error);
      this.callHistory = [];
    }
  }

  saveCallHistory() {
    try {
      // Keep only the most recent items
      if (this.callHistory.length > this.maxHistoryItems) {
        this.callHistory = this.callHistory.slice(-this.maxHistoryItems);
      }
      
      localStorage.setItem('callHistory', JSON.stringify(this.callHistory));
    } catch (error) {
      console.error('Error saving call history:', error);
    }
  }

  addCallRecord(callData) {
    const record = {
      id: this.generateCallId(),
      contactId: callData.contactId,
      contactName: callData.contactName,
      contactAvatar: callData.contactAvatar,
      type: callData.type, // 'audio' or 'video'
      direction: callData.direction, // 'incoming', 'outgoing', 'missed'
      startTime: callData.startTime,
      endTime: callData.endTime,
      duration: callData.duration || 0,
      timestamp: Date.now()
    };

    this.callHistory.unshift(record); // Add to beginning
    this.saveCallHistory();
    this.renderCallHistory();
    
    console.log('📞 Call record added:', record);
  }

  handleCallStarted(callData) {
    console.log('📞 Call started:', callData);
    
    // For now, we'll add the record when call ends
    // This is temporary storage for the active call
    this.activeCall = {
      contactId: callData.contactId,
      contactName: callData.contactName,
      contactAvatar: callData.contactAvatar,
      type: callData.type,
      direction: callData.direction,
      startTime: new Date()
    };
  }

  handleCallEnded(callData) {
    console.log('📞 Call ended:', callData);
    
    if (this.activeCall) {
      const endTime = new Date();
      const duration = Math.floor((endTime - this.activeCall.startTime) / 1000);
      
      this.addCallRecord({
        ...this.activeCall,
        endTime: endTime,
        duration: duration,
        direction: duration > 0 ? this.activeCall.direction : 'missed'
      });
      
      this.activeCall = null;
    }
  }

  handleCallMissed(callData) {
    console.log('📞 Call missed:', callData);
    
    this.addCallRecord({
      ...callData,
      direction: 'missed',
      duration: 0,
      startTime: new Date(),
      endTime: new Date()
    });
  }

  renderCallHistory() {
    if (!this.callsListElement) return;

    // Show/hide empty state
    if (this.callHistory.length === 0) {
      if (this.emptyStateElement) {
        this.emptyStateElement.style.display = 'block';
      }
      return;
    }

    if (this.emptyStateElement) {
      this.emptyStateElement.style.display = 'none';
    }

    // Group calls by date
    const groupedCalls = this.groupCallsByDate();
    
    // Clear existing content except empty state
    const existingItems = this.callsListElement.querySelectorAll('.call-item, .call-date-group');
    existingItems.forEach(item => item.remove());

    // Render grouped calls
    Object.entries(groupedCalls).forEach(([dateKey, calls]) => {
      // Add date header
      const dateHeader = this.createDateHeader(dateKey);
      this.callsListElement.appendChild(dateHeader);

      // Add calls for this date
      calls.forEach(call => {
        const callItem = this.createCallItem(call);
        this.callsListElement.appendChild(callItem);
      });
    });
  }

  groupCallsByDate() {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    this.callHistory.forEach(call => {
      const callDate = new Date(call.startTime);
      let dateKey;

      if (this.isSameDay(callDate, today)) {
        dateKey = 'Hoy';
      } else if (this.isSameDay(callDate, yesterday)) {
        dateKey = 'Ayer';
      } else {
        dateKey = callDate.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(call);
    });

    return groups;
  }

  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  createDateHeader(dateText) {
    const header = document.createElement('div');
    header.className = 'call-date-group';
    header.innerHTML = `
      <div class="date-header">
        <span class="date-text">${dateText}</span>
      </div>
    `;
    return header;
  }

  createCallItem(call) {
    const item = document.createElement('div');
    item.className = 'call-item';
    item.dataset.callId = call.id;
    item.dataset.contactId = call.contactId;

    const directionIcon = this.getDirectionIcon(call.direction, call.type);
    const timeText = this.formatTime(new Date(call.startTime));
    const durationText = this.formatDuration(call.duration);
    
    item.innerHTML = `
      <div class="call-contact-info">
        <div class="call-avatar">
          <img src="${call.contactAvatar || 'images/user-placeholder-40.svg'}" alt="${call.contactName}">
        </div>
        <div class="call-details">
          <div class="call-contact-name">${call.contactName}</div>
          <div class="call-info">
            <span class="call-direction ${call.direction}">
              ${directionIcon}
              ${this.getCallTypeText(call)}
            </span>
            ${call.duration > 0 ? `<span class="call-duration-text">${durationText}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="call-actions">
        <span class="call-time">${timeText}</span>
        <button class="call-action-btn call-back-btn" title="Devolver llamada" data-type="${call.type}">
          <i class="fas fa-${call.type === 'video' ? 'video' : 'phone'}"></i>
        </button>
      </div>
    `;

    // Bind call back action
    const callBackBtn = item.querySelector('.call-back-btn');
    if (callBackBtn) {
      callBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleCallBack(call);
      });
    }

    // Make item clickable to view contact
    item.addEventListener('click', () => {
      this.handleCallItemClick(call);
    });

    return item;
  }

  getDirectionIcon(direction, type) {
    const isVideo = type === 'video';
    const baseIcon = isVideo ? 'video' : 'phone';
    
    switch (direction) {
      case 'incoming':
        return `<i class="fas fa-${baseIcon} incoming"></i>`;
      case 'outgoing':
        return `<i class="fas fa-${baseIcon} outgoing"></i>`;
      case 'missed':
        return `<i class="fas fa-${baseIcon}-slash missed"></i>`;
      default:
        return `<i class="fas fa-${baseIcon}"></i>`;
    }
  }

  getCallTypeText(call) {
    const typeText = call.type === 'video' ? 'Videollamada' : 'Llamada';
    const directionText = {
      'incoming': 'entrante',
      'outgoing': 'saliente',
      'missed': 'perdida'
    }[call.direction] || '';
    
    return call.direction === 'missed' 
      ? `${typeText} perdida` 
      : `${typeText} ${directionText}`;
  }

  formatTime(date) {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  }

  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  }

  handleCallBack(call) {
    console.log('📞 Call back:', call);
    
    // Find and open the contact's conversation
    if (window.chatManager && call.contactId) {
      // Switch to the conversation first
      const conversation = { 
        userId: call.contactId, 
        name: call.contactName,
        profilePhoto: call.contactAvatar
      };
      
      window.chatManager.openConversation(conversation);
      
      // Small delay to ensure conversation is loaded
      setTimeout(() => {
        if (window.callManager) {
          window.callManager.initiateCall(call.type);
        }
      }, 500);
    }
  }

  handleCallItemClick(call) {
    console.log('📞 Call item clicked:', call);
    
    // Open the contact's conversation
    if (window.chatManager && call.contactId) {
      const conversation = { 
        userId: call.contactId, 
        name: call.contactName,
        profilePhoto: call.contactAvatar
      };
      
      window.chatManager.openConversation(conversation);
      
      // Switch to chats tab
      const chatsTab = document.querySelector('[data-tab="chats"]');
      if (chatsTab) {
        chatsTab.click();
      }
    }
  }

  generateCallId() {
    return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Public methods for integration with call manager
  recordOutgoingCall(contactData, type) {
    const callData = {
      contactId: contactData.userId || contactData.id,
      contactName: contactData.name || contactData.username,
      contactAvatar: contactData.profilePhoto || contactData.avatar,
      type: type,
      direction: 'outgoing'
    };
    
    this.handleCallStarted(callData);
  }

  recordIncomingCall(contactData, type) {
    const callData = {
      contactId: contactData.userId || contactData.id,
      contactName: contactData.name || contactData.username,
      contactAvatar: contactData.profilePhoto || contactData.avatar,
      type: type,
      direction: 'incoming'
    };
    
    this.handleCallStarted(callData);
  }

  recordMissedCall(contactData, type) {
    const callData = {
      contactId: contactData.userId || contactData.id,
      contactName: contactData.name || contactData.username,
      contactAvatar: contactData.profilePhoto || contactData.avatar,
      type: type
    };
    
    this.handleCallMissed(callData);
  }

  // Get call statistics
  getCallStatistics() {
    const stats = {
      total: this.callHistory.length,
      outgoing: 0,
      incoming: 0,
      missed: 0,
      video: 0,
      audio: 0,
      totalDuration: 0
    };

    this.callHistory.forEach(call => {
      stats[call.direction]++;
      stats[call.type]++;
      stats.totalDuration += call.duration;
    });

    return stats;
  }

  // Clear call history
  clearHistory() {
    if (confirm('¿Estás seguro de que quieres eliminar todo el historial de llamadas?')) {
      this.callHistory = [];
      this.saveCallHistory();
      this.renderCallHistory();
      console.log('📞 Call history cleared');
    }
  }
}

// Initialize call history manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.callHistoryManager = new CallHistoryManager();
  console.log('📞 Call History Manager initialized');
});