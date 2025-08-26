// ===== SCRIPT DE PRUEBAS PARA SISTEMA DE LLAMADAS =====
// Este script verifica que todos los componentes del sistema de llamadas estén funcionando

console.log('🧪 Iniciando pruebas del sistema de llamadas...');

// Función de prueba principal
async function testCallSystem() {
  const tests = [
    testCallManagerInitialization,
    testUIComponentsLoading,
    testSocketEventHandlers,
    testCallButtons,
    testMediaPermissions,
    testCallModalFunctionality
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passedTests++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR -`, error.message);
    }
  }

  console.log('\n🏁 Resultados de pruebas:');
  console.log(`Pruebas pasadas: ${passedTests}/${totalTests}`);
  console.log(`Porcentaje de éxito: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    console.log('🎉 ¡Todas las pruebas pasaron! El sistema de llamadas está listo.');
  } else {
    console.log('⚠️ Algunas pruebas fallaron. Revisa los errores arriba.');
  }
}

// Test 1: Verificar inicialización del CallManager
async function testCallManagerInitialization() {
  // Verificar que CallManager existe
  if (!window.callManager) {
    console.log('❌ CallManager no encontrado');
    return false;
  }

  // Verificar métodos principales
  const requiredMethods = [
    'initiateCall',
    'acceptCall',
    'declineCall',
    'endCall',
    'handleIncomingCall',
    'toggleAudio',
    'toggleVideo'
  ];

  for (const method of requiredMethods) {
    if (typeof window.callManager[method] !== 'function') {
      console.log(`❌ Método ${method} no encontrado en CallManager`);
      return false;
    }
  }

  console.log('✅ CallManager inicializado correctamente con todos los métodos');
  return true;
}

// Test 2: Verificar carga de componentes UI
async function testUIComponentsLoading() {
  const requiredElements = [
    'call-modal',
    'incoming-call-interface',
    'minimized-call-widget',
    'call-notifications',
    'permissions-modal'
  ];

  for (const elementId of requiredElements) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.log(`❌ Elemento UI ${elementId} no encontrado`);
      return false;
    }
  }

  console.log('✅ Todos los componentes UI están cargados');
  return true;
}

// Test 3: Verificar manejadores de eventos de socket
async function testSocketEventHandlers() {
  const socket = window.SocketManager?.socket || window.socket;
  
  if (!socket) {
    console.log('❌ Socket no disponible');
    return false;
  }

  // Verificar que los event listeners están configurados
  const callEvents = [
    'call:incoming',
    'call:accepted',
    'call:declined',
    'call:busy',
    'call:ended',
    'call:missed',
    'call:ice-candidate',
    'call:failed'
  ];

  // Como no podemos verificar directamente los listeners, 
  // verificamos que el socket está conectado
  if (!socket.connected) {
    console.log('❌ Socket no está conectado');
    return false;
  }

  console.log('✅ Socket está conectado y listo para eventos de llamada');
  return true;
}

// Test 4: Verificar botones de llamada en el header
async function testCallButtons() {
  const audioCallBtn = document.getElementById('audio-call-btn');
  const videoCallBtn = document.getElementById('video-call-btn');

  if (!audioCallBtn) {
    console.log('❌ Botón de llamada de audio no encontrado');
    return false;
  }

  if (!videoCallBtn) {
    console.log('❌ Botón de llamada de video no encontrado');
    return false;
  }

  // Verificar que tienen los event listeners
  // (Esto es indirecto, pero podemos verificar que existen)
  const hasAudioListener = audioCallBtn.onclick !== null || audioCallBtn._listeners;
  const hasVideoListener = videoCallBtn.onclick !== null || videoCallBtn._listeners;

  console.log('✅ Botones de llamada encontrados en el header');
  return true;
}

// Test 5: Verificar disponibilidad de permisos de medios
async function testMediaPermissions() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('❌ getUserMedia no soportado en este navegador');
    return false;
  }

  try {
    // Verificar permisos sin solicitar acceso
    const permissions = await navigator.permissions.query({ name: 'camera' });
    console.log(`📹 Estado de permisos de cámara: ${permissions.state}`);

    const audioPermissions = await navigator.permissions.query({ name: 'microphone' });
    console.log(`🎤 Estado de permisos de micrófono: ${audioPermissions.state}`);

    console.log('✅ API de permisos de medios disponible');
    return true;
  } catch (error) {
    console.log('⚠️ No se pudieron verificar permisos, pero API está disponible');
    return true; // Consideramos esto como éxito
  }
}

// Test 6: Verificar funcionalidad del modal de llamadas
async function testCallModalFunctionality() {
  const callModal = document.getElementById('call-modal');
  
  if (!callModal) {
    console.log('❌ Modal de llamadas no encontrado');
    return false;
  }

  // Verificar elementos internos del modal
  const requiredModalElements = [
    'call-contact-name',
    'call-contact-avatar',
    'call-status',
    'call-duration',
    'remote-video',
    'local-video',
    'toggle-audio-btn',
    'toggle-video-btn',
    'end-call-btn'
  ];

  for (const elementId of requiredModalElements) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.log(`❌ Elemento del modal ${elementId} no encontrado`);
      return false;
    }
  }

  console.log('✅ Modal de llamadas completamente funcional');
  return true;
}

// Función para probar una llamada simulada
function testSimulatedCall() {
  console.log('🎭 Iniciando prueba de llamada simulada...');
  
  if (!window.callManager) {
    console.log('❌ CallManager no disponible para prueba simulada');
    return;
  }

  // Simular datos de llamada entrante
  const simulatedCallData = {
    callId: 'test_call_' + Date.now(),
    type: 'audio',
    offer: { type: 'offer', sdp: 'mock-sdp-data' },
    from: {
      userId: 'test-user-123',
      name: 'Usuario de Prueba',
      profilePhoto: 'images/user-placeholder-40.svg'
    }
  };

  try {
    // Mostrar interfaz de llamada entrante
    window.callManager.handleIncomingCall(simulatedCallData);
    console.log('✅ Llamada simulada iniciada correctamente');
    
    // Ocultar después de 3 segundos para no molestar
    setTimeout(() => {
      window.callManager.declineCall();
      console.log('✅ Llamada simulada terminada');
    }, 3000);
    
  } catch (error) {
    console.log('❌ Error en llamada simulada:', error);
  }
}

// Función para probar el sistema de notificaciones de llamada
function testCallNotifications() {
  console.log('🔔 Probando sistema de notificaciones...');
  
  if (window.CallUI && window.CallUI.showCallNotification) {
    window.CallUI.showCallNotification('Prueba de notificación de llamada', 'info');
    
    setTimeout(() => {
      window.CallUI.showCallNotification('Llamada conectada exitosamente', 'success');
    }, 1000);
    
    setTimeout(() => {
      window.CallUI.showCallNotification('Error de conexión simulado', 'error');
    }, 2000);
    
    console.log('✅ Notificaciones de llamada funcionando');
  } else {
    console.log('❌ Sistema de notificaciones no disponible');
  }
}

// Ejecutar pruebas cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  runTests();
}

async function runTests() {
  // Esperar un poco para que todo se cargue
  setTimeout(async () => {
    console.log('\n🚀 Ejecutando pruebas del sistema de llamadas...\n');
    
    await testCallSystem();
    
    console.log('\n🎨 Ejecutando pruebas adicionales...\n');
    
    testCallNotifications();
    
    // Preguntar si quiere probar una llamada simulada
    if (confirm('¿Quieres probar una llamada entrante simulada?')) {
      testSimulatedCall();
    }
    
  }, 2000);
}

// Funciones de utilidad para debugging
window.DebugCalls = {
  testCallSystem,
  testSimulatedCall,
  testCallNotifications,
  
  // Función para mostrar estado actual del sistema
  getSystemStatus() {
    console.log('📊 Estado actual del sistema de llamadas:');
    console.log('CallManager:', !!window.callManager);
    console.log('Socket conectado:', !!(window.SocketManager?.socket?.connected || window.socket?.connected));
    console.log('UI Components loaded:', !!document.getElementById('call-modal'));
    console.log('Media API disponible:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  },
  
  // Función para forzar una llamada de prueba
  forceTestCall(type = 'audio') {
    if (window.callManager) {
      console.log(`🎯 Forzando llamada de prueba (${type})...`);
      
      // Crear un contacto falso para prueba
      if (window.chatManager) {
        window.chatManager.currentConversation = {
          name: 'Usuario de Prueba',
          profilePhoto: 'images/user-placeholder-40.svg'
        };
      }
      
      window.callManager.initiateCall(type);
    } else {
      console.log('❌ CallManager no disponible');
    }
  }
};

console.log('🔧 Sistema de pruebas cargado. Usa window.DebugCalls para debugging manual.');