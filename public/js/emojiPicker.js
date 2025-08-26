/**
 * EmojiPicker - Selector de emojis completo con categorías
 */
class EmojiPicker {
    constructor() {
        this.isOpen = false;
        this.currentCategory = 'smileys';
        this.searchQuery = '';
        this.pickerElement = null;
        this.inputElement = null;
        
        // Datos de emojis organizados por categorías
        this.emojiData = {
            smileys: {
                name: 'Sonrisas y personas',
                icon: '😀',
                emojis: [
                    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
                    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
                    '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
                    '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
                    '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'
                ]
            },
            animals: {
                name: 'Animales y naturaleza',
                icon: '🐶',
                emojis: [
                    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
                    '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
                    '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
                    '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
                    '🦟', '🦗', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐'
                ]
            },
            food: {
                name: 'Comida y bebida',
                icon: '🍎',
                emojis: [
                    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
                    '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
                    '🥒', '🌶️', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
                    '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇',
                    '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙'
                ]
            },
            activities: {
                name: 'Actividades',
                icon: '⚽',
                emojis: [
                    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
                    '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
                    '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
                    '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️',
                    '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗'
                ]
            },
            travel: {
                name: 'Viajes y lugares',
                icon: '🚗',
                emojis: [
                    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
                    '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛺', '🚨',
                    '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞',
                    '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️',
                    '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '⛵', '🚤'
                ]
            },
            objects: {
                name: 'Objetos',
                icon: '📱',
                emojis: [
                    '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿',
                    '📀', '🧮', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️',
                    '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏰',
                    '⏲️', '⏰', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗',
                    '🕘', '🕙', '🕚', '🕛', '🌡️', '⛱️', '🧴', '🧵', '🧶', '👓'
                ]
            },
            symbols: {
                name: 'Símbolos',
                icon: '❤️',
                emojis: [
                    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
                    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
                    '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
                    '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
                    '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳'
                ]
            },
            flags: {
                name: 'Banderas',
                icon: '🏁',
                emojis: [
                    '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽',
                    '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲',
                    '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪',
                    '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬',
                    '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶'
                ]
            }
        };
        
        this.recentEmojis = this.loadRecentEmojis();
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Evitar múltiples listeners
        document.removeEventListener('click', this.handleDocumentClick.bind(this));
        document.addEventListener('click', this.handleDocumentClick.bind(this));
    }
    
    toggle(inputElement) {
        this.inputElement = inputElement;
        
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.render();
        this.position();
        
        // Animación de apertura
        setTimeout(() => {
            if (this.pickerElement) {
                this.pickerElement.classList.add('show');
            }
        }, 10);
    }
    
    close() {
        if (!this.isOpen || !this.pickerElement) return;
        
        this.isOpen = false;
        this.pickerElement.classList.remove('show');
        
        setTimeout(() => {
            if (this.pickerElement && this.pickerElement.parentNode) {
                this.pickerElement.parentNode.removeChild(this.pickerElement);
            }
            this.pickerElement = null;
        }, 300);
    }
    
    render() {
        // Remover picker existente
        const existingPicker = document.getElementById('emoji-picker-advanced');
        if (existingPicker) {
            existingPicker.remove();
        }
        
        // Crear elemento principal
        this.pickerElement = document.createElement('div');
        this.pickerElement.id = 'emoji-picker-advanced';
        this.pickerElement.className = 'emoji-picker-advanced';
        
        this.pickerElement.innerHTML = `
            <div class="emoji-picker-header">
                <div class="emoji-search-container">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Buscar emojis..." class="emoji-search-input">
                </div>
                <button class="emoji-picker-close-btn" title="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="emoji-picker-categories">
                ${this.renderCategoryTabs()}
            </div>
            
            <div class="emoji-picker-content">
                ${this.renderEmojiGrid()}
            </div>
            
            ${this.recentEmojis.length > 0 ? `
                <div class="emoji-picker-recent">
                    <div class="emoji-category-header">Recientes</div>
                    <div class="emoji-grid">
                        ${this.recentEmojis.map(emoji => 
                            `<span class="emoji-item" data-emoji="${emoji}">${emoji}</span>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        document.body.appendChild(this.pickerElement);
        this.setupPickerEventListeners();
    }
    
    renderCategoryTabs() {
        return Object.keys(this.emojiData).map(categoryKey => {
            const category = this.emojiData[categoryKey];
            return `
                <button class="emoji-category-tab ${categoryKey === this.currentCategory ? 'active' : ''}" 
                        data-category="${categoryKey}"
                        title="${category.name}">
                    ${category.icon}
                </button>
            `;
        }).join('');
    }
    
    renderEmojiGrid() {
        const category = this.emojiData[this.currentCategory];
        if (!category) return '';
        
        let emojisToShow = category.emojis;
        
        // Filtrar por búsqueda si hay query
        if (this.searchQuery) {
            emojisToShow = this.getAllEmojis().filter(emoji => 
                this.searchQuery.toLowerCase().split('').every(char => 
                    this.getEmojiKeywords(emoji).some(keyword => 
                        keyword.toLowerCase().includes(char)
                    )
                )
            );
        }
        
        return `
            <div class="emoji-category-header">${category.name}</div>
            <div class="emoji-grid">
                ${emojisToShow.map(emoji => 
                    `<span class="emoji-item" data-emoji="${emoji}">${emoji}</span>`
                ).join('')}
            </div>
        `;
    }
    
    getAllEmojis() {
        return Object.values(this.emojiData).flatMap(category => category.emojis);
    }
    
    getEmojiKeywords(emoji) {
        // Mapeo básico de emojis a palabras clave
        const keywords = {
            '😀': ['sonrisa', 'feliz', 'alegre'],
            '😂': ['risa', 'carcajada', 'lol'],
            '❤️': ['corazón', 'amor', 'love'],
            '👍': ['pulgar', 'bien', 'ok', 'like'],
            '🎉': ['celebración', 'fiesta', 'party'],
            // Agregar más según necesidad
        };
        
        return keywords[emoji] || [emoji];
    }
    
    setupPickerEventListeners() {
        if (!this.pickerElement) return;
        
        // Botón de cerrar
        const closeBtn = this.pickerElement.querySelector('.emoji-picker-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            });
        }
        
        // Búsqueda de emojis
        const searchInput = this.pickerElement.querySelector('.emoji-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.updateEmojiGrid();
            });
        }
        
        // Tabs de categorías
        this.pickerElement.querySelectorAll('.emoji-category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const category = tab.getAttribute('data-category');
                this.selectCategory(category);
            });
        });
        
        // Selección de emojis
        this.pickerElement.querySelectorAll('.emoji-item').forEach(emojiElement => {
            emojiElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const emoji = emojiElement.getAttribute('data-emoji');
                this.selectEmoji(emoji);
            });
        });
        
        // Prevenir cierre al hacer clic dentro del picker
        this.pickerElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    selectCategory(categoryKey) {
        this.currentCategory = categoryKey;
        this.searchQuery = '';
        
        // Actualizar tabs activos
        this.pickerElement.querySelectorAll('.emoji-category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = this.pickerElement.querySelector(`[data-category="${categoryKey}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Actualizar grid
        this.updateEmojiGrid();
        
        // Limpiar búsqueda
        const searchInput = this.pickerElement.querySelector('.emoji-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
    }
    
    updateEmojiGrid() {
        const content = this.pickerElement.querySelector('.emoji-picker-content');
        if (content) {
            content.innerHTML = this.renderEmojiGrid();
            
            // Re-agregar event listeners a los nuevos emojis
            content.querySelectorAll('.emoji-item').forEach(emojiElement => {
                emojiElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const emoji = emojiElement.getAttribute('data-emoji');
                    this.selectEmoji(emoji);
                });
            });
        }
    }
    
    selectEmoji(emoji) {
        if (this.inputElement) {
            // Verificar si es un contenteditable o un input normal
            if (this.inputElement.contentEditable === 'true') {
                // Manejar contenteditable div
                this.insertEmojiInContentEditable(emoji);
            } else {
                // Manejar input normal
                this.insertEmojiInInput(emoji);
            }
        }
        
        // Agregar a emojis recientes
        this.addToRecent(emoji);
        
        // NO cerrar el picker automáticamente - el usuario puede elegir más emojis
        
        // Trigger input event para que otros listeners puedan reaccionar
        if (this.inputElement) {
            this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    insertEmojiInContentEditable(emoji) {
        // Focus en el elemento
        this.inputElement.focus();
        
        // Obtener la selección actual
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            // Hay una selección activa
            const range = selection.getRangeAt(0);
            
            // Crear un nodo de texto con el emoji
            const emojiNode = document.createTextNode(emoji);
            
            // Eliminar contenido seleccionado e insertar emoji
            range.deleteContents();
            range.insertNode(emojiNode);
            
            // Mover el cursor después del emoji
            range.setStartAfter(emojiNode);
            range.setEndAfter(emojiNode);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // No hay selección, insertar al final
            const emojiNode = document.createTextNode(emoji);
            this.inputElement.appendChild(emojiNode);
            
            // Colocar cursor al final
            const range = document.createRange();
            const selection = window.getSelection();
            range.setStartAfter(emojiNode);
            range.setEndAfter(emojiNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    
    insertEmojiInInput(emoji) {
        // Insertar emoji en la posición del cursor para inputs normales
        const start = this.inputElement.selectionStart;
        const end = this.inputElement.selectionEnd;
        const value = this.inputElement.value;
        
        this.inputElement.value = value.slice(0, start) + emoji + value.slice(end);
        
        // Restaurar posición del cursor
        const newPosition = start + emoji.length;
        this.inputElement.setSelectionRange(newPosition, newPosition);
        this.inputElement.focus();
    }
    
    addToRecent(emoji) {
        // Remover si ya existe para evitar duplicados
        this.recentEmojis = this.recentEmojis.filter(e => e !== emoji);
        
        // Agregar al principio
        this.recentEmojis.unshift(emoji);
        
        // Mantener solo los últimos 20
        this.recentEmojis = this.recentEmojis.slice(0, 20);
        
        // Guardar en localStorage
        this.saveRecentEmojis();
    }
    
    loadRecentEmojis() {
        try {
            const recent = localStorage.getItem('emoji-picker-recent');
            return recent ? JSON.parse(recent) : [];
        } catch (error) {
            return [];
        }
    }
    
    saveRecentEmojis() {
        try {
            localStorage.setItem('emoji-picker-recent', JSON.stringify(this.recentEmojis));
        } catch (error) {
            console.error('Error saving recent emojis:', error);
        }
    }
    
    position() {
        if (!this.pickerElement) return;
        
        // Usar el botón de adjuntos como referencia para el posicionamiento
        const attachBtn = document.querySelector('#attach-btn');
        if (!attachBtn) return;
        
        const rect = attachBtn.getBoundingClientRect();
        const pickerRect = this.pickerElement.getBoundingClientRect();
        
        let bottom = window.innerHeight - rect.top + 10;
        let left = rect.left;
        
        // Ajustar si se sale de la pantalla
        if (left + pickerRect.width > window.innerWidth) {
            left = window.innerWidth - pickerRect.width - 20;
        }
        
        if (bottom + pickerRect.height > window.innerHeight) {
            bottom = window.innerHeight - pickerRect.height - 20;
        }
        
        this.pickerElement.style.position = 'fixed';
        this.pickerElement.style.bottom = `${bottom}px`;
        this.pickerElement.style.left = `${left}px`;
        this.pickerElement.style.zIndex = '10000';
    }
    
    handleDocumentClick(e) {
        // Cerrar picker si se hace clic fuera de él
        if (this.isOpen && this.pickerElement && !this.pickerElement.contains(e.target)) {
            const attachBtn = document.querySelector('#attach-btn');
            const emojiOption = document.querySelector('.attachment-option.emoji');
            if ((!attachBtn || !attachBtn.contains(e.target)) && 
                (!emojiOption || !emojiOption.contains(e.target))) {
                this.close();
            }
        }
    }
}

// CSS para el selector de emojis
const emojiPickerStyles = `
    .emoji-picker-advanced {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        width: 320px;
        max-height: 400px;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: scale(0.9) translateY(10px);
        transition: all 0.3s ease;
        border: 1px solid #e5e7eb;
    }
    
    .emoji-picker-advanced.show {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
    
    .emoji-picker-header {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }
    
    .emoji-search-container {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1;
    }
    
    .emoji-picker-close-btn {
        background: none;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        font-size: 16px;
        transition: all 0.2s ease;
        flex-shrink: 0;
    }
    
    .emoji-picker-close-btn:hover {
        background-color: #f3f4f6;
        color: #374151;
    }
    
    .emoji-picker-close-btn:active {
        transform: scale(0.95);
    }
    
    .emoji-search-container i {
        position: absolute;
        left: 12px;
        color: #6b7280;
        font-size: 14px;
        pointer-events: none;
    }
    
    .emoji-search-input {
        width: 100%;
        padding: 8px 12px 8px 35px;
        border: 1px solid #d1d5db;
        border-radius: 20px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s ease;
    }
    
    .emoji-search-input:focus {
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    
    .emoji-picker-categories {
        display: flex;
        padding: 8px;
        border-bottom: 1px solid #e5e7eb;
        gap: 4px;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        align-items: center;
        justify-content: center;
        min-height: 50px;
    }
    
    .emoji-picker-categories::-webkit-scrollbar {
        display: none;
    }
    
    .emoji-category-tab {
        background: none;
        border: none;
        padding: 10px 12px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.2s ease;
        white-space: nowrap;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
    }
    
    .emoji-category-tab:hover {
        background-color: #f3f4f6;
        transform: scale(1.05);
    }
    
    .emoji-category-tab.active {
        background-color: #4f46e5;
        color: white;
        transform: scale(1.1);
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    }
    
    .emoji-category-tab.active:hover {
        background-color: #4338ca;
        transform: scale(1.1);
    }
    
    .emoji-picker-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px;
        max-height: 250px;
    }
    
    .emoji-category-header {
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #f3f4f6;
    }
    
    .emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
        margin-bottom: 16px;
    }
    
    .emoji-item {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        font-size: 20px;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s ease;
        user-select: none;
        aspect-ratio: 1;
    }
    
    .emoji-item:hover {
        background-color: #f3f4f6;
        transform: scale(1.1);
    }
    
    .emoji-item:active {
        transform: scale(0.95);
    }
    
    .emoji-picker-recent {
        border-top: 1px solid #e5e7eb;
        padding: 8px 12px;
        max-height: 100px;
        overflow-y: auto;
    }
    
    .emoji-picker-recent .emoji-grid {
        margin-bottom: 0;
    }
    
    /* Scrollbar personalizado para contenido */
    .emoji-picker-content::-webkit-scrollbar,
    .emoji-picker-recent::-webkit-scrollbar {
        width: 6px;
    }
    
    .emoji-picker-content::-webkit-scrollbar-track,
    .emoji-picker-recent::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
    }
    
    .emoji-picker-content::-webkit-scrollbar-thumb,
    .emoji-picker-recent::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
    }
    
    .emoji-picker-content::-webkit-scrollbar-thumb:hover,
    .emoji-picker-recent::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
    
    /* Responsive para pantallas pequeñas */
    @media (max-width: 480px) {
        .emoji-picker-advanced {
            width: 280px;
            max-height: 350px;
        }
        
        .emoji-grid {
            grid-template-columns: repeat(7, 1fr);
        }
        
        .emoji-item {
            font-size: 18px;
            padding: 4px;
        }
    }
    
    /* Animaciones suaves */
    @keyframes emojiHover {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1.1); }
    }
    
    .emoji-item:hover {
        animation: emojiHover 0.3s ease;
    }
    
    /* Estados de carga */
    .emoji-picker-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #6b7280;
    }
    
    .emoji-picker-loading i {
        margin-right: 8px;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;

// Inyectar estilos
if (!document.getElementById('emoji-picker-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'emoji-picker-styles';
    styleSheet.textContent = emojiPickerStyles;
    document.head.appendChild(styleSheet);
}

// Crear instancia global
window.emojiPicker = new EmojiPicker();