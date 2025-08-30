// Script de prueba para la funcionalidad de cámara
// Ejecutar en la consola del navegador para debuggear

console.log('INICIANDO PRUEBAS DE CÁMARA...');

// Test 1: Verificar que los elementos existen
console.log('Test 1: Verificando elementos DOM...');
const overlay = document.getElementById('camera-modal-overlay');
const video = document.getElementById('camera-video');
const attachBtn = document.getElementById('attach-btn');
const cameraBtn = document.querySelector('.attachment-option.camera');

console.log('Overlay:', overlay ? 'Encontrado' : 'NO ENCONTRADO');
console.log('Video:', video ? 'Encontrado' : 'NO ENCONTRADO');  
console.log('Botón Adjuntos:', attachBtn ? 'Encontrado' : 'NO ENCONTRADO');
console.log('Botón Cámara:', cameraBtn ? 'Encontrado' : 'NO ENCONTRADO');

// Test 2: Verificar que las clases CSS existen
console.log('\nTest 2: Verificando estilos CSS...');
const overlayStyles = window.getComputedStyle(overlay);
console.log('Overlay display inicial:', overlayStyles.display);
console.log('Overlay z-index:', overlayStyles.zIndex);

// Test 3: Simular click en botón de cámara
console.log('\nTest 3: Simulando click en cámara...');
if (cameraBtn) {
    console.log('Haciendo click en botón de cámara...');
    cameraBtn.click();
    
    // Verificar después de 1 segundo
    setTimeout(() => {
        const newDisplay = window.getComputedStyle(overlay).display;
        console.log('Display después del click:', newDisplay);
        
        if (newDisplay === 'flex') {
            console.log('¡ÉXITO! El modal se abrió correctamente');
        } else {
            console.log('FALLO: El modal no se abrió');
        }
    }, 1000);
} else {
    console.log('No se puede probar: botón de cámara no encontrado');
}

// Test 4: Verificar permisos de cámara
console.log('\nTest 4: Verificando permisos de cámara...');
navigator.mediaDevices.getUserMedia({ video: true })
    .then(() => {
        console.log('Permisos de cámara: CONCEDIDOS');
    })
    .catch((error) => {
        console.log('❌ Permisos de cámara:', error.name, error.message);
    });

console.log('\n🧪 PRUEBAS COMPLETADAS - Revisa los resultados arriba');