// Variables globales
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-message-btn');
const messagesContainer = document.querySelector('.messages-container');
const chatItems = document.querySelectorAll('.chat-item');
const newChatButton = document.getElementById('new-chat-btn');
const settingsButton = document.getElementById('settings-btn');

// Datos de muestra para simular mensajes y contactos
const currentUser = {
    id: 1,
    name: 'Usuario',
    avatar: '/images/user-placeholder-40.svg'
};

const contacts = [
    {
        id: 2,
        name: 'Ana García',
        avatar: '/images/user-placeholder-40.svg',
        online: true,
        lastMessage: {
            text: '¿Cómo va el proyecto?',
            time: '12:45',
            unread: 2
        }
    },
    {
        id: 3,
        name: 'Juan Pérez',
        avatar: '/images/user-placeholder-40.svg',
        online: false,
        lastMessage: {
            text: 'Ok, te veo mañana',
            time: 'Ayer',
            read: true
        }
    },
    {
        id: 4,
        name: 'Laura Martínez',
        avatar: '/images/user-placeholder-40.svg',
        online: false,
        lastMessage: {
            text: 'La presentación quedó genial',
            time: '20/04',
            read: true
        }
    }
];

// Función para crear un nuevo mensaje
function createMessage(text, isCurrentUser) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isCurrentUser ? 'sent' : 'received');
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // Si no es el usuario actual (es un mensaje recibido), añadir avatar
    if (!isCurrentUser) {
        const avatar = document.createElement('img');
        avatar.src = contacts[0].avatar;
        avatar.alt = contacts[0].name;
        avatar.classList.add('message-avatar');
        messageDiv.appendChild(avatar);
    }
    
    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    messageText.textContent = text;
    
    const messageTime = document.createElement('span');
    messageTime.classList.add('message-time');
    
    // Obtener la hora actual
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    messageTime.textContent = `${hours}:${minutes}`;
    
    messageContent.appendChild(messageText);
    messageContent.appendChild(messageTime);
    
    // Si es el usuario actual (mensaje enviado), añadir estado de lectura
    if (isCurrentUser) {
        const messageStatus = document.createElement('span');
        messageStatus.classList.add('message-status');
        
        const statusIcon = document.createElement('i');
        // Por ahora, solo mostrar que se envió
        statusIcon.classList.add('fas', 'fa-check');
        statusIcon.classList.add('message-sent');
        
        messageStatus.appendChild(statusIcon);
        messageContent.appendChild(messageStatus);
    }
    
    messageDiv.appendChild(messageContent);
    return messageDiv;
}

// Función para enviar mensaje
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (messageText !== '') {
        // Crear y añadir mensaje
        const newMessage = createMessage(messageText, true);
        messagesContainer.appendChild(newMessage);
        
        // Limpiar el input
        messageInput.value = '';
        
        // Hacer scroll al final
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Simular respuesta después de un tiempo aleatorio (entre 1 y 3 segundos)
        setTimeout(() => {
            simulateTyping();
            
            setTimeout(() => {
                // Quitar indicador de escritura
                const typingIndicator = document.querySelector('.typing');
                if (typingIndicator) {
                    typingIndicator.remove();
                }
                
                // Simular respuesta
                simulateResponse(messageText);
            }, getRandomTime(1000, 3000));
        }, getRandomTime(500, 1500));
    }
}

// Función para mostrar indicador de escritura
function simulateTyping() {
    // Verificar si ya existe un indicador de escritura
    const existingTyping = document.querySelector('.typing');
    if (existingTyping) {
        return;
    }
    
    // Crear elemento para indicador de escritura
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'received', 'typing');
    
    const avatar = document.createElement('img');
    avatar.src = contacts[0].avatar;
    avatar.alt = contacts[0].name;
    avatar.classList.add('message-avatar');
    
    const content = document.createElement('div');
    content.classList.add('message-content');
    
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    
    // Añadir 3 puntos para la animación
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        indicator.appendChild(dot);
    }
    
    content.appendChild(indicator);
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Función para generar respuestas automáticas
function simulateResponse(originalMessage) {
    let response;
    
    // Respuestas básicas basadas en el mensaje original
    if (originalMessage.toLowerCase().includes('hola') || originalMessage.toLowerCase().includes('hey')) {
        response = '¡Hola! ¿Cómo estás?';
    } else if (originalMessage.toLowerCase().includes('proyecto')) {
        response = 'El proyecto va bien, estamos en tiempo para entregar. ¿Has podido revisar la última actualización?';
    } else if (originalMessage.toLowerCase().includes('reunión')) {
        response = '¿Te parece bien tener la reunión el viernes a las 10?';
    } else if (originalMessage.toLowerCase().includes('gracias')) {
        response = '¡De nada! Estamos para ayudarnos.';
    } else if (originalMessage.toLowerCase().includes('fecha') || originalMessage.toLowerCase().includes('entrega')) {
        response = 'La fecha de entrega es el próximo lunes. Creo que llegaremos a tiempo.';
    } else {
        // Respuestas genéricas
        const genericResponses = [
            '¡Interesante! ¿Puedes contarme más?',
            'Entiendo. Vamos a discutirlo en la próxima reunión.',
            'Estoy de acuerdo contigo en eso.',
            '¿Qué opinas sobre hacer una videollamada para discutirlo mejor?',
            'Gracias por la información, lo revisaré.',
            '¿Has hablado con el resto del equipo sobre esto?'
        ];
        
        // Seleccionar una respuesta aleatoria
        response = genericResponses[Math.floor(Math.random() * genericResponses.length)];
    }
    
    // Crear y añadir el mensaje de respuesta
    const responseMessage = createMessage(response, false);
    messagesContainer.appendChild(responseMessage);
    
    // Hacer scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Actualizar último mensaje en la lista de chats
    updateLastMessage(response);
}

// Función para obtener tiempo aleatorio
function getRandomTime(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Función para actualizar el último mensaje en la lista de chats
function updateLastMessage(text) {
    const activeChat = document.querySelector('.chat-item.active');
    if (activeChat) {
        const lastMessageEl = activeChat.querySelector('.chat-last-msg');
        if (lastMessageEl) {
            lastMessageEl.textContent = text;
        }
        
        const timeEl = activeChat.querySelector('.chat-time');
        if (timeEl) {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            timeEl.textContent = `${hours}:${minutes}`;
        }
        
        // Actualizar indicadores (marcar como leído)
        const indicatorsEl = activeChat.querySelector('.chat-indicators');
        if (indicatorsEl) {
            // Eliminar contador de no leídos si existe
            const unreadCountEl = indicatorsEl.querySelector('.unread-count');
            if (unreadCountEl) {
                unreadCountEl.remove();
            }
            
            // Añadir icono de leído si no existe
            if (!indicatorsEl.querySelector('.message-read')) {
                indicatorsEl.innerHTML = '<i class="fas fa-check-double message-read"></i>';
            }
        }
    }
}

// Cambiar chat activo
function setActiveChat(chatItem) {
    // Eliminar clase activa de todos los chats
    chatItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Añadir clase activa al chat seleccionado
    chatItem.classList.add('active');
    
    // Actualizar encabezado del chat
    const chatName = chatItem.querySelector('.chat-name').textContent;
    const chatImg = chatItem.querySelector('.chat-img').src;
    
    document.querySelector('.chat-header .contact-info h3').textContent = chatName;
    document.querySelector('.chat-header .contact-info img').src = chatImg;
    
    // Simular carga de mensajes (en una aplicación real, cargaríamos mensajes desde el servidor)
    simulateLoadMessages(chatName);
}

// Función para simular carga de mensajes (en una app real, esto sería una llamada a API)
function simulateLoadMessages(chatName) {
    // Limpiar mensajes actuales
    messagesContainer.innerHTML = '';
    
    // Añadir separador de fecha
    const dateDivider = document.createElement('div');
    dateDivider.classList.add('date-divider');
    dateDivider.innerHTML = '<span>Hoy</span>';
    messagesContainer.appendChild(dateDivider);
    
    // Generar algunos mensajes aleatorios basados en el contacto
    if (chatName === 'Ana García') {
        // Mensajes predefinidos para Ana
        addMessage('¡Hola! ¿Cómo estás?', false);
        addMessage('¿Pudiste revisar los cambios que hice en el documento?', false);
        addMessage('¡Hola Ana! Todo bien, gracias. ¿Y tú?', true);
        addMessage('Sí, ya los revisé. Me gusta mucho cómo quedó la sección de resultados. Solo tengo un par de comentarios menores.', true);
        addMessage('¡Genial! ¿Cómo va el proyecto en general? ¿Estamos a tiempo para la entrega?', false);
    } else if (chatName === 'Juan Pérez') {
        // Mensajes predefinidos para Juan
        addMessage('Necesito los archivos del proyecto anterior', false);
        addMessage('Te los envío en un momento', true);
        addMessage('Gracias, son para la presentación de mañana', false);
        addMessage('¿A qué hora es la presentación?', true);
        addMessage('A las 10:00 am en la sala de juntas', false);
        addMessage('Ok, te veo mañana', true);
    } else if (chatName === 'Laura Martínez') {
        // Mensajes predefinidos para Laura
        addMessage('¿Ya tienes la última versión del informe?', false);
        addMessage('Sí, acabo de terminarla', true);
        addMessage('¿Me la puedes compartir?', false);
        addMessage('Claro, te la envío por correo', true);
        addMessage('La presentación quedó genial', false);
    } else if (chatName === 'Grupo de Trabajo') {
        // Mensajes predefinidos para el grupo
        addMessage('Bienvenidos al nuevo grupo de trabajo', false);
        addMessage('Hola a todos', true);
        addMessage('María: ¿Cuándo comenzamos?', false);
        addMessage('Roberto: Yo ya empecé con mi parte', false);
        addMessage('Podemos empezar mañana', true);
        addMessage('Carlos: Ya terminé mi parte', false);
    }
    
    // Hacer scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Función auxiliar para añadir mensajes
function addMessage(text, isCurrentUser) {
    const message = createMessage(text, isCurrentUser);
    messagesContainer.appendChild(message);
}

// Función para mostrar nuevo chat
function showNewChatDialog() {
    // En una aplicación real, esto abriría un diálogo para seleccionar contactos
    alert('Esta funcionalidad estaría disponible en una versión completa de la aplicación.');
}

// Función para mostrar configuraciones
function showSettings() {
    // En una aplicación real, esto abriría un menú de configuraciones
    alert('Configuraciones: En una versión completa, aquí podrías cambiar tema, notificaciones, privacidad, etc.');
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

chatItems.forEach(item => {
    item.addEventListener('click', () => {
        setActiveChat(item);
    });
});

newChatButton.addEventListener('click', showNewChatDialog);
settingsButton.addEventListener('click', showSettings);

// Inicialización: mensaje de bienvenida después de cargar la página
window.addEventListener('load', () => {
    // Simular que el primer chat está activo por defecto
    setActiveChat(chatItems[0]);
    
    // Mostrar un indicador de escritura después de un momento
    setTimeout(() => {
        simulateTyping();
        
        // Después de un tiempo, mostrar un mensaje de bienvenida
        setTimeout(() => {
            // Quitar indicador de escritura
            const typingIndicator = document.querySelector('.typing');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // En una aplicación real, este mensaje podría venir del servidor
            const welcomeMessage = '¡Bienvenido de nuevo! ¿En qué puedo ayudarte hoy?';
            const message = createMessage(welcomeMessage, false);
            messagesContainer.appendChild(message);
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 2000);
    }, 1000);
});