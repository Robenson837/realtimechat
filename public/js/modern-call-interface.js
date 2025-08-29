/* ======================================
   MODERN CALL INTERFACE FUNCTIONALITY
   Draggable local video and enhanced controls
   ====================================== */

class ModernCallInterface {
    constructor() {
        this.localVideoModal = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.init();
    }

    init() {
        this.localVideoModal = document.getElementById('local-video-modal');
        this.setupDraggableVideo();
        this.setupVideoControls();
    }

    setupDraggableVideo() {
        if (!this.localVideoModal) return;

        this.localVideoModal.addEventListener('mousedown', this.startDrag.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));

        // Touch events for mobile
        this.localVideoModal.addEventListener('touchstart', this.startDrag.bind(this));
        document.addEventListener('touchmove', this.drag.bind(this));
        document.addEventListener('touchend', this.endDrag.bind(this));
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        const rect = this.localVideoModal.getBoundingClientRect();
        
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;
        
        this.localVideoModal.style.cursor = 'grabbing';
        this.localVideoModal.style.zIndex = '300';
    }

    drag(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        const newX = clientX - this.dragOffset.x;
        const newY = clientY - this.dragOffset.y;
        
        // Constrain to viewport
        const maxX = window.innerWidth - this.localVideoModal.offsetWidth;
        const maxY = window.innerHeight - this.localVideoModal.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        this.localVideoModal.style.left = constrainedX + 'px';
        this.localVideoModal.style.top = constrainedY + 'px';
        this.localVideoModal.style.right = 'auto';
    }

    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.localVideoModal.style.cursor = 'move';
        this.localVideoModal.style.zIndex = '200';
    }

    setupVideoControls() {
        // Flip camera button
        const flipBtn = document.getElementById('flip-camera-btn');
        if (flipBtn) {
            flipBtn.addEventListener('click', this.handleFlipCamera.bind(this));
        }

        // Camera toggle button  
        const cameraToggleBtn = document.getElementById('camera-toggle-btn');
        if (cameraToggleBtn) {
            cameraToggleBtn.addEventListener('click', this.handleCameraToggle.bind(this));
        }
    }

    handleFlipCamera() {
        // Trigger the existing switch camera functionality
        const switchCameraBtn = document.getElementById('switch-camera-btn');
        if (switchCameraBtn) {
            switchCameraBtn.click();
        }
        
        // Add visual feedback
        const flipBtn = document.getElementById('flip-camera-btn');
        if (flipBtn) {
            flipBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                flipBtn.style.transform = 'scale(1)';
            }, 150);
        }
    }

    handleCameraToggle() {
        // Trigger the existing video toggle functionality
        const videoToggleBtn = document.getElementById('toggle-video-btn');
        if (videoToggleBtn) {
            videoToggleBtn.click();
        }

        // Update button state
        const cameraToggleBtn = document.getElementById('camera-toggle-btn');
        if (cameraToggleBtn) {
            const icon = cameraToggleBtn.querySelector('i');
            const isOff = icon.classList.contains('fa-video-slash');
            
            if (isOff) {
                icon.classList.remove('fa-video-slash');
                icon.classList.add('fa-video');
                cameraToggleBtn.style.background = 'rgba(255,255,255,0.2)';
            } else {
                icon.classList.remove('fa-video');
                icon.classList.add('fa-video-slash');
                cameraToggleBtn.style.background = '#ef4444';
            }
        }
    }

    // Position modal in different corners
    positionModal(corner = 'top-right') {
        if (!this.localVideoModal) return;

        const positions = {
            'top-right': { top: '100px', right: '20px', left: 'auto' },
            'top-left': { top: '100px', left: '20px', right: 'auto' },
            'bottom-right': { bottom: '120px', right: '20px', left: 'auto' },
            'bottom-left': { bottom: '120px', left: '20px', right: 'auto' }
        };

        const position = positions[corner];
        Object.keys(position).forEach(key => {
            this.localVideoModal.style[key] = position[key];
        });
    }

    // Show/hide local video modal
    toggleLocalVideo(show) {
        if (!this.localVideoModal) return;
        
        this.localVideoModal.style.display = show ? 'block' : 'none';
    }

    // Update call state UI
    updateCallState(state) {
        const callModal = document.getElementById('call-modal');
        const incomingInterface = document.getElementById('incoming-call-interface');
        const videoContainer = document.getElementById('call-video-container');
        const audioDisplay = document.getElementById('audio-call-display');

        switch (state) {
            case 'incoming':
                incomingInterface.classList.add('show');
                videoContainer.style.display = 'none';
                this.toggleLocalVideo(false);
                break;
            case 'video':
                incomingInterface.classList.remove('show');
                videoContainer.style.display = 'block';
                audioDisplay.classList.remove('show');
                this.toggleLocalVideo(true);
                break;
            case 'audio':
                incomingInterface.classList.remove('show');
                videoContainer.style.display = 'block';
                audioDisplay.classList.add('show');
                this.toggleLocalVideo(false);
                break;
            case 'ended':
                callModal.classList.remove('show');
                callModal.style.display = 'none';
                break;
        }
    }

    // Enhanced button states
    updateButtonState(buttonId, state) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        const icon = button.querySelector('i');
        
        switch (buttonId) {
            case 'toggle-audio-btn':
                if (state === 'muted') {
                    icon.classList.remove('fa-microphone');
                    icon.classList.add('fa-microphone-slash');
                    button.classList.add('muted');
                } else {
                    icon.classList.remove('fa-microphone-slash');
                    icon.classList.add('fa-microphone');
                    button.classList.remove('muted');
                }
                break;
            case 'toggle-speaker-btn':
                if (state === 'active') {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
                break;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modernCallInterface = new ModernCallInterface();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernCallInterface;
}