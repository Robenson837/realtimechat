# 📞 Sistema de Llamadas WebRTC - VigiChat

## 🚀 Características Implementadas

### ✅ Funcionalidades Completas
- **Llamadas de Voz y Video en Tiempo Real** usando WebRTC
- **Interfaz de Usuario Moderna** con animaciones y efectos visuales
- **Señalización Robusta** a través de Socket.IO
- **Soporte Multi-dispositivo** con sincronización de estado
- **Gestión Inteligente de Permisos** de cámara y micrófono
- **Notificaciones de Llamada** con sonidos y alertas visuales
- **Widget Minimizado** para llamadas en segundo plano
- **Historial de Llamadas** integrado con el sistema de mensajería
- **Diseño Responsivo** optimizado para móviles y desktop

### 🔧 Componentes del Sistema

#### 1. Frontend Components
- **CallManager** (`public/js/callManager.js`) - Clase principal para gestión de llamadas
- **UI Components** (`public/call-ui-components.html`) - Componentes de interfaz de usuario
- **CSS Styling** (`public/css/calls.css`) - Estilos modernos y responsivos
- **Test Suite** (`test-calls.js`) - Suite de pruebas automatizadas

#### 2. Backend Integration
- **Socket Handlers** (`socket/socketHandlers.js`) - Manejadores de eventos WebRTC
- **Real-time Signaling** - Intercambio de ofertas, respuestas y candidatos ICE
- **User Presence** - Estado de conectividad y disponibilidad

#### 3. UI Elements
- **Call Modal** - Interfaz principal durante llamadas activas
- **Incoming Call Interface** - Pantalla para llamadas entrantes
- **Minimized Widget** - Control de llamadas minimizado
- **Permissions Modal** - Solicitud de permisos de medios
- **Notifications System** - Alertas y notificaciones de estado

## 🎯 Cómo Usar el Sistema

### Para Usuarios
1. **Iniciar Llamada**: Haz clic en los botones 📞 (audio) o 📹 (video) en el header del chat
2. **Recibir Llamada**: Acepta o rechaza las llamadas entrantes
3. **Durante la Llamada**: Usa los controles para silenciar, desactivar video, o cambiar cámara
4. **Minimizar**: Minimiza la llamada para usar otras partes de la aplicación
5. **Finalizar**: Usa el botón rojo para terminar la llamada

### Para Desarrolladores

#### Inicialización
```javascript
// El CallManager se inicializa automáticamente
window.callManager = new CallManager();

// Los event listeners se configuran automáticamente
setupHeaderCallButtons();
setupCallSocketListeners();
```

#### API Principal
```javascript
// Iniciar llamada
window.callManager.initiateCall('audio'); // o 'video'

// Manejar llamada entrante
window.callManager.handleIncomingCall(callData);

// Controlar llamada activa
window.callManager.toggleAudio();
window.callManager.toggleVideo();
window.callManager.endCall();
```

#### Eventos de Socket
```javascript
// Eventos enviados por el cliente
socket.emit('call:initiate', {
  callId: 'unique-call-id',
  to: 'recipient-user-id',
  type: 'audio|video',
  offer: rtcOffer
});

// Eventos recibidos del servidor
socket.on('call:incoming', (data) => {
  // Manejar llamada entrante
});
```

## 🛠️ Configuración Técnica

### Requisitos del Sistema
- **WebRTC Support** - Navegadores modernos (Chrome 70+, Firefox 65+, Safari 12+)
- **HTTPS** - Requerido para acceso a medios en producción
- **Socket.IO** - Para señalización en tiempo real
- **ICE Servers** - STUN/TURN servers para atravesar NATs

### Configuración de ICE Servers
```javascript
// En CallManager constructor
this.iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Para producción, agregar servidor TURN
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
};
```

### Variables de Entorno Recomendadas
```env
# Para TURN server (opcional pero recomendado para producción)
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_PASSWORD=your-password

# Para debugging
CALL_DEBUG=true
WEBRTC_LOG_LEVEL=verbose
```

## 🔍 Sistema de Pruebas

### Ejecutar Pruebas
```javascript
// En la consola del navegador
window.DebugCalls.testCallSystem(); // Ejecutar suite completa
window.DebugCalls.getSystemStatus(); // Ver estado actual
window.DebugCalls.forceTestCall('audio'); // Probar llamada
```

### Debugging
```javascript
// Ver estado del CallManager
console.log('CallManager State:', window.callManager);

// Ver conexión de socket
console.log('Socket Connected:', window.SocketManager?.socket?.connected);

// Probar notificaciones
window.CallUI.showCallNotification('Test message', 'success');
```

## 📱 Compatibilidad

### Navegadores Soportados
- ✅ **Chrome** 70+ (Completo)
- ✅ **Firefox** 65+ (Completo)
- ✅ **Safari** 12+ (Completo)
- ✅ **Edge** 79+ (Completo)
- ⚠️ **Mobile Safari** (Limitado - no permite video en background)
- ⚠️ **Chrome Mobile** (Limitado - requiere interacción de usuario)

### Características por Dispositivo
| Característica | Desktop | Mobile | Notas |
|---|---|---|---|
| Llamadas de Voz | ✅ | ✅ | Completo |
| Videollamadas | ✅ | ✅ | Completo |
| Cambio de Cámara | ✅ | ✅ | Front/Back camera |
| Minimizar Llamada | ✅ | ✅ | Widget responsivo |
| Notificaciones | ✅ | ⚠️ | Limitado por browser |

## 🚀 Instalación y Configuración

### 1. Archivos Incluidos
```
public/
├── js/callManager.js              # Lógica principal
├── css/calls.css                  # Estilos del sistema
├── call-ui-components.html        # Componentes UI
└── sounds/                        # Sonidos de llamada (opcional)
    ├── ringtone.mp3
    ├── connecting.mp3
    └── ended.mp3

socket/
└── socketHandlers.js              # Manejadores backend (modificado)

test-calls.js                      # Suite de pruebas
```

### 2. Integración en HTML
```html
<!-- CSS -->
<link rel="stylesheet" href="css/calls.css">

<!-- JavaScript -->
<script src="js/callManager.js"></script>

<!-- UI Components (cargado dinámicamente) -->
<div id="call-ui-container"></div>
```

### 3. Configuración del Backend
El sistema funciona con el socketHandlers.js existente, que ya incluye:
- Eventos de llamada (`call:initiate`, `call:accept`, etc.)
- Relay de candidatos ICE
- Gestión de estados de llamada
- Notificaciones multi-dispositivo

## 📊 Métricas y Monitoreo

### Eventos Rastreados
- Llamadas iniciadas/recibidas
- Duración de llamadas
- Calidad de conexión (ICE state)
- Errores de conexión
- Uso de ancho de banda

### Logging
```javascript
// Logs disponibles en consola
console.log('📞 Call events');  // Eventos generales
console.log('🎯 ICE events');   // Conectividad WebRTC  
console.log('🔊 Media events'); // Audio/Video
console.log('❌ Call errors');  // Errores
```

## 🛡️ Seguridad y Privacidad

### Medidas Implementadas
- ✅ **Verificación de Permisos** - Solo usuarios autenticados
- ✅ **Validación de Llamadas** - Verificación de contactos
- ✅ **Timeout de Llamadas** - Auto-finalización después de inactividad
- ✅ **Limpieza de Recursos** - Liberación automática de streams
- ✅ **Rate Limiting** - Prevención de spam de llamadas

### Consideraciones de Privacidad
- Los streams de video/audio nunca se almacenan
- Las señales WebRTC son end-to-end entre navegadores
- El servidor solo actúa como relay para señalización
- Los permisos se solicitan explícitamente al usuario

## 🔧 Solución de Problemas

### Problemas Comunes

#### 1. "Usuario no disponible"
- Verificar que el destinatario esté en línea
- Comprobar conexión de socket del destinatario
- Revisar estado de presencia en activeUsers

#### 2. "Error al acceder a cámara/micrófono"
- Verificar permisos del navegador
- Comprobar que el sitio use HTTPS
- Revisar que no haya otra aplicación usando los medios

#### 3. "Conexión fallida"
- Verificar ICE servers
- Comprobar conectividad de red
- Revisar firewall/NAT configuration

#### 4. "Sin audio/video"
- Verificar configuración de navegador
- Comprobar tracks de media stream
- Revisar estado de peer connection

### Debugging Avanzado
```javascript
// Verificar estado completo del sistema
window.DebugCalls.getSystemStatus();

// Ver estadísticas de WebRTC
if (window.callManager?.peerConnection) {
  window.callManager.peerConnection.getStats().then(console.log);
}

// Logs detallados
localStorage.setItem('debug', 'call:*');
```

## 🚀 Próximas Mejoras

### Funcionalidades Planificadas
- [ ] **Llamadas Grupales** - Soporte para múltiples participantes
- [ ] **Compartir Pantalla** - Screen sharing durante llamadas
- [ ] **Grabación de Llamadas** - Con consentimiento de usuarios
- [ ] **Calidad Adaptativa** - Ajuste automático según conexión
- [ ] **Filtros de Video** - Efectos y backgrounds virtuales
- [ ] **Transcripción en Vivo** - Speech-to-text durante llamadas
- [ ] **Integración con Calendario** - Llamadas programadas
- [ ] **Métricas Avanzadas** - Analytics de calidad de llamada

### Optimizaciones Técnicas
- [ ] **Codec Selection** - Optimización automática de códecs
- [ ] **Bandwidth Management** - Control inteligente de ancho de banda
- [ ] **Connection Recovery** - Reconexión automática mejorada
- [ ] **Load Balancing** - Distribución de carga en servidores
- [ ] **CDN Integration** - Optimización de entrega de contenido

## 📞 Soporte

Para reportar problemas o solicitar funcionalidades:
1. Revisar este README y la documentación
2. Ejecutar las pruebas automáticas
3. Revisar logs de consola
4. Contactar al equipo de desarrollo con detalles específicos

---

**Desarrollado con ❤️ para VigiChat**  
*Sistema de llamadas en tiempo real con WebRTC*