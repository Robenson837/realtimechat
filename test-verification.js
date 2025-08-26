/**
 * Test del Sistema de Verificación
 * Script para probar la funcionalidad de cuentas verificadas
 */

console.log('🧪 Iniciando test del sistema de verificación...');

// Función para probar el sistema
function testVerificationSystem() {
    if (!window.verificationSystem) {
        console.error('❌ Sistema de verificación no encontrado');
        return;
    }

    console.log('✅ Sistema de verificación disponible');
    
    // Test 1: Verificar correo conocido
    const testEmail = 'robensoninnocent12@gmail.com';
    const isVerified = window.verificationSystem.isVerifiedEmail(testEmail);
    console.log(`📧 Email ${testEmail} verificado: ${isVerified}`);
    
    // Test 2: Verificar correo no verificado
    const testEmail2 = 'test@example.com';
    const isVerified2 = window.verificationSystem.isVerifiedEmail(testEmail2);
    console.log(`📧 Email ${testEmail2} verificado: ${isVerified2}`);
    
    // Test 3: Generar badge
    const badge = window.verificationSystem.generateVerificationBadge();
    console.log(`🏷️ Badge generado: ${badge}`);
    
    // Test 4: Generar etiqueta oficial
    const label = window.verificationSystem.generateOfficialLabel();
    console.log(`🏷️ Etiqueta oficial generada: ${label}`);
    
    // Test 5: Probar con usuario verificado
    const verifiedUser = {
        fullName: 'Usuario Verificado',
        email: 'robensoninnocent12@gmail.com'
    };
    const displayName = window.verificationSystem.generateVerifiedDisplayName(verifiedUser);
    console.log(`👤 Nombre con verificación: ${displayName}`);
    
    // Test 6: Probar con usuario no verificado
    const normalUser = {
        fullName: 'Usuario Normal',
        email: 'normal@example.com'
    };
    const normalDisplayName = window.verificationSystem.generateVerifiedDisplayName(normalUser);
    console.log(`👤 Nombre normal: ${normalDisplayName}`);
    
    // Test 7: Obtener lista de correos verificados
    const verifiedEmails = window.verificationSystem.getVerifiedEmails();
    console.log(`📋 Correos verificados (${verifiedEmails.length}):`, verifiedEmails);
    
    console.log('✅ Tests completados');
}

// Función para crear usuario de prueba visual
function createTestUserElement() {
    const testContainer = document.createElement('div');
    testContainer.innerHTML = `
        <div style="position: fixed; top: 10px; right: 10px; background: white; border: 2px solid #4f46e5; border-radius: 8px; padding: 16px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 300px;">
            <h4 style="margin: 0 0 12px 0; color: #4f46e5; font-size: 14px; font-weight: 600;">🧪 Test Sistema Verificación</h4>
            
            <div style="margin-bottom: 12px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="width: 40px; height: 40px; position: relative; margin-right: 12px;">
                        <img src="https://ui-avatars.com/api/?name=Usuario+Verificado&background=1877F2&color=fff&size=40" 
                             style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid #e2e8f0;">
                        <!-- El badge se agregará automáticamente aquí -->
                    </div>
                    <div>
                        <div class="contact-name" data-user-email="robensoninnocent12@gmail.com" style="font-weight: 600; margin-bottom: 4px;">
                            Usuario Verificado
                        </div>
                        <small style="color: #64748b;">SVG azul + "Oficial" con fondo + badge en foto</small>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 12px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="width: 40px; height: 40px; position: relative; margin-right: 12px;">
                        <img src="https://ui-avatars.com/api/?name=Usuario+Normal&background=6b7280&color=fff&size=40" 
                             style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid #e2e8f0;">
                    </div>
                    <div>
                        <div class="contact-name" data-user-email="normal@example.com" style="font-weight: 600; margin-bottom: 4px;">
                            Usuario Normal
                        </div>
                        <small style="color: #64748b;">Solo nombre, sin verificación</small>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 12px; padding: 8px; border: 1px solid #1877F2; border-radius: 4px; background: #f8faff;">
                <div class="user-name" data-user-email="robensoninnocent12@gmail.com" style="font-weight: 600; margin-bottom: 4px;">
                    En Modal de Perfil
                </div>
                <small style="color: #1877F2;">SVG azul + "Oficial" SIN fondo</small>
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button onclick="testVerificationSystem()" style="padding: 4px 8px; background: #4f46e5; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                    Ejecutar Test
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(testContainer);
    
    // Aplicar verificación después de un delay
    setTimeout(() => {
        if (window.verificationSystem) {
            window.verificationSystem.updateAllUserElements();
        }
    }, 500);
}

// Función para agregar nuevo correo verificado
function addVerifiedEmail(email) {
    if (window.verificationSystem) {
        const success = window.verificationSystem.addVerifiedEmail(email);
        if (success) {
            console.log(`✅ Email ${email} agregado a verificados`);
            window.verificationSystem.updateAllUserElements();
        } else {
            console.log(`⚠️ Email ${email} ya estaba en la lista`);
        }
    }
}

// Función para remover correo verificado  
function removeVerifiedEmail(email) {
    if (window.verificationSystem) {
        const success = window.verificationSystem.removeVerifiedEmail(email);
        if (success) {
            console.log(`❌ Email ${email} removido de verificados`);
            window.verificationSystem.updateAllUserElements();
        } else {
            console.log(`⚠️ Email ${email} no estaba en la lista`);
        }
    }
}

// Exportar funciones para uso en consola
window.testVerificationSystem = testVerificationSystem;
window.createTestUserElement = createTestUserElement;
window.addVerifiedEmail = addVerifiedEmail;
window.removeVerifiedEmail = removeVerifiedEmail;

// Auto-ejecutar cuando el sistema esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.verificationSystem) {
            console.log('🚀 Sistema de verificación listo');
            console.log('💡 Funciones disponibles:');
            console.log('   - testVerificationSystem() - Ejecutar tests');
            console.log('   - createTestUserElement() - Crear elemento de prueba visual');
            console.log('   - addVerifiedEmail("email") - Agregar email verificado');
            console.log('   - removeVerifiedEmail("email") - Remover email verificado');
            console.log('   - window.verificationSystem.updateAllUserElements() - Forzar actualización');
            
            // Ejecutar test inicial
            testVerificationSystem();
            
            // Crear elemento de prueba visual automáticamente
            createTestUserElement();
            
            // Forzar actualización de todos los elementos
            console.log('🔄 Ejecutando actualización automática de elementos...');
            window.verificationSystem.updateAllUserElements();
        }
    }, 2000);
});

console.log('🔧 Test de verificación cargado');