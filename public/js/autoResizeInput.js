// Auto-resize input functionality
class AutoResizeInput {
    constructor() {
        this.inputField = null;
        this.inputWrapper = null;
        this.minHeight = 24; // Altura mínima del input
        this.maxHeight = 120; // Altura máxima del input
        this.lineHeight = 24; // Altura aproximada de una línea
        
        this.init();
    }
    
    init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAutoResize());
        } else {
            this.setupAutoResize();
        }
    }
    
    setupAutoResize() {
        this.inputField = document.getElementById('message-input');
        this.inputWrapper = document.querySelector('.message-input-wrapper');
        
        if (this.inputField && this.inputWrapper) {
            // Configurar evento de input para auto-resize
            this.inputField.addEventListener('input', () => this.adjustHeight());
            this.inputField.addEventListener('keydown', (e) => this.handleKeydown(e));
            
            // También escuchar eventos de paste
            this.inputField.addEventListener('paste', () => {
                setTimeout(() => this.adjustHeight(), 10);
            });
            
            console.log('AutoResizeInput inicializado correctamente');
        } else {
            // Reintentar después de un tiempo si los elementos no están listos
            setTimeout(() => this.setupAutoResize(), 500);
        }
    }
    
    handleKeydown(e) {
        // Manejar Enter para enviar mensaje (no nueva línea a menos que se mantenga Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
            return;
        }
        
        // Permitir nueva línea con Shift + Enter
        if (e.key === 'Enter' && e.shiftKey) {
            setTimeout(() => this.adjustHeight(), 10);
        }
    }
    
    adjustHeight() {
        if (!this.inputField || !this.inputWrapper) return;
        
        // Resetear altura para calcular la altura necesaria
        this.inputField.style.height = 'auto';
        
        // Calcular nueva altura basada en el scrollHeight
        const scrollHeight = this.inputField.scrollHeight;
        let newHeight = Math.max(this.minHeight, Math.min(scrollHeight, this.maxHeight));
        
        // Aplicar la nueva altura
        this.inputField.style.height = newHeight + 'px';
        
        // Ajustar también el wrapper - más conservador
        const wrapperHeight = newHeight + 20; // padding ajustado
        this.inputWrapper.style.minHeight = Math.max(44, wrapperHeight) + 'px';
        
        // Si excede el máximo, activar scroll
        if (scrollHeight > this.maxHeight) {
            this.inputField.style.overflowY = 'auto';
            this.inputField.scrollTop = this.inputField.scrollHeight;
        } else {
            this.inputField.style.overflowY = 'hidden';
        }
    }
    
    sendMessage() {
        // Disparar el evento de envío de mensaje
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
        }
        
        // Resetear altura después de enviar
        setTimeout(() => this.resetHeight(), 100);
    }
    
    resetHeight() {
        if (!this.inputField || !this.inputWrapper) return;
        
        this.inputField.style.height = 'auto';
        this.inputWrapper.style.minHeight = '44px';
    }
    
    // Método público para resetear el input externamente
    reset() {
        this.resetHeight();
    }
    
    // Método para obtener el contenido del input
    getContent() {
        return this.inputField ? this.inputField.textContent || this.inputField.innerText || '' : '';
    }
    
    // Método para limpiar el input
    clear() {
        if (this.inputField) {
            this.inputField.textContent = '';
            this.inputField.innerHTML = '';
            this.resetHeight();
        }
    }
    
    // Método para enfocar el input
    focus() {
        if (this.inputField) {
            this.inputField.focus();
        }
    }
}

// Crear instancia global
window.autoResizeInput = new AutoResizeInput();

// También integrar con el chat manager existente si está disponible
document.addEventListener('DOMContentLoaded', () => {
    // Buscar el chat manager y añadir hooks si existe
    const checkChatManager = () => {
        if (window.ChatManager && window.ChatManager.prototype) {
            const originalSendMessage = window.ChatManager.prototype.sendMessage;
            if (originalSendMessage) {
                window.ChatManager.prototype.sendMessage = function() {
                    const result = originalSendMessage.call(this);
                    // Resetear altura después de enviar mensaje
                    if (window.autoResizeInput) {
                        window.autoResizeInput.reset();
                    }
                    return result;
                };
            }
        }
    };
    
    setTimeout(checkChatManager, 1000);
});

// Export para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoResizeInput;
}