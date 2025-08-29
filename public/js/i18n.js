/**
 * VigiChat Internationalization System
 * Sistema de internacionalización ligero pero completo para VigiChat
 */

class I18nManager {
    constructor() {
        this.currentLanguage = 'es'; // Idioma por defecto
        this.translations = {};
        this.supportedLanguages = {
            'es': {
                name: 'Español',
                nativeName: 'Español',
                flag: '🇪🇸',
                flagUrl: 'https://flagcdn.com/16x12/es.png'
            },
            'en': {
                name: 'English',
                nativeName: 'English', 
                flag: '🇺🇸',
                flagUrl: 'https://flagcdn.com/16x12/us.png'
            },
            'fr': {
                name: 'French',
                nativeName: 'Français',
                flag: '🇫🇷',
                flagUrl: 'https://flagcdn.com/16x12/fr.png'
            },
            'ht': {
                name: 'Haitian Creole',
                nativeName: 'Kreyòl Ayisyen',
                flag: '🇭🇹',
                flagUrl: 'https://flagcdn.com/16x12/ht.png'
            }
        };
        
        this.init();
    }
    
    async init() {
        // Primero detectar idioma del navegador si no hay preferencia guardada
        const savedLanguage = localStorage.getItem('vigichat-language');
        if (savedLanguage && this.supportedLanguages[savedLanguage]) {
            this.currentLanguage = savedLanguage;
            console.log(`🌐 Using saved language: ${this.currentLanguage}`);
        } else {
            // Detectar automáticamente el idioma del navegador
            const detectedLang = this.detectBrowserLanguage();
            if (this.supportedLanguages[detectedLang]) {
                this.currentLanguage = detectedLang;
                // Guardar la detección automática
                localStorage.setItem('vigichat-language', detectedLang);
                console.log(`🌐 Auto-detected browser language: ${this.currentLanguage}`);
            }
        }
        
        // Cargar traducciones
        await this.loadTranslations();
        
        // Aplicar traducciones
        this.applyTranslations();
        
        console.log(`🌐 I18n initialized with language: ${this.currentLanguage}`);
    }
    
    async loadTranslations() {
        try {
            // Cargar archivo de traducciones para el idioma actual
            const response = await fetch(`/translations/${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations = await response.json();
                console.log(`✅ Translations loaded for: ${this.currentLanguage}`);
            } else {
                console.warn(`⚠️ No translations file found for: ${this.currentLanguage}`);
                // Fallback a español si no existe el archivo
                if (this.currentLanguage !== 'es') {
                    const fallbackResponse = await fetch('/translations/es.json');
                    if (fallbackResponse.ok) {
                        this.translations = await fallbackResponse.json();
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading translations:', error);
            // Usar traducciones inline como fallback
            this.translations = this.getFallbackTranslations();
        }
    }
    
    getFallbackTranslations() {
        const fallback = {
            es: {
                // App Name
                'app_name': 'VigiChat',
                
                // Loading Screen
                'loading.connecting': 'Conectando...',
                
                // Auth - Login Form
                'auth.welcome_back': 'Bienvenido de vuelta',
                'auth.login_subtitle': 'Inicia sesión para continuar con tus conversaciones',
                'auth.email_placeholder': 'Correo electrónico',
                'auth.password_placeholder': 'Contraseña',
                'auth.login_button': 'Iniciar Sesión',
                'auth.or': 'o',
                'auth.google_login': 'Google',
                'auth.otp_login': 'Iniciar con OTP',
                'auth.no_account': '¿No tienes cuenta?',
                'auth.register_here': 'Regístrate aquí',
                'auth.forgot_password': '¿Olvidaste tu contraseña?',
                'auth.show_password': 'Mostrar contraseña',
                'auth.hide_password': 'Ocultar contraseña',
                
                // Auth - Register Form
                'auth.create_account': 'Crear cuenta',
                'auth.register_subtitle': 'Únete a la mejor plataforma de mensajería',
                'auth.fullname_placeholder': 'Nombre completo',
                'auth.password_min': 'Contraseña (mín. 6 caracteres)',
                'auth.create_button': 'Crear Cuenta',
                'auth.have_account': '¿Ya tienes cuenta?',
                'auth.login_here': 'Inicia sesión',
                
                // Auth - Forgot Password
                'auth.recover_password': 'Recuperar contraseña',
                'auth.recover_subtitle': 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña',
                'auth.send_link': 'Enviar enlace',
                'auth.back_to_login': '← Volver al inicio de sesión',
                
                // Auth - Reset Password
                'auth.new_password': 'Nueva contraseña',
                'auth.new_password_subtitle': 'Ingresa tu nueva contraseña',
                'auth.new_password_placeholder': 'Nueva contraseña (mín. 6 caracteres)',
                'auth.confirm_password_placeholder': 'Confirmar nueva contraseña',
                'auth.passwords_match': 'Las contraseñas coinciden',
                'auth.reset_password_button': 'Restablecer contraseña',
                
                // Auth - Success
                'auth.password_updated': '¡Contraseña actualizada!',
                'auth.password_success_subtitle': 'Tu contraseña ha sido restablecida exitosamente',
                'auth.return_login': 'Iniciar sesión',
                
                // Auth - Magic Link (OTP)
                'auth.otp_title': 'Iniciar con OTP',
                'auth.otp_subtitle': 'Ingresa tu correo y te enviaremos un código OTP para iniciar sesión sin contraseña',
                'auth.send_otp': 'Enviar OTP',
                'auth.back_to_login_magic': '← Volver al inicio de sesión',
                
                // Mobile Header
                'mobile.menu': 'Menú principal',
                
                // Sidebar
                'sidebar.chats': 'Chats',
                'sidebar.contacts': 'Contactos',
                'sidebar.requests': 'Solicitudes',
                'sidebar.calls': 'Llamadas',
                'sidebar.search_chats': 'Buscar chats...',
                'sidebar.search_contacts': 'Buscar contactos...',
                'sidebar.add_contact': 'Agregar contacto',
                'sidebar.recent_calls': 'Llamadas recientes',
                'sidebar.no_recent_calls': 'No hay llamadas recientes',
                'sidebar.calls_description': 'Las llamadas que realices o recibas aparecerán aquí',
                
                // Main Menu
                'main_menu.profile_settings': 'Ajustes de perfil',
                'main_menu.add_contact': 'Agregar contacto',
                'main_menu.blocked_contacts': 'Contactos bloqueados',
                'main_menu.language': 'Idioma',
                'main_menu.help': 'Ayuda',
                'main_menu.logout': 'Cerrar sesión',
                
                // Welcome Screen
                'welcome.title': 'Bienvenido a VigiChat',
                'welcome.subtitle': 'Selecciona un chat para comenzar a conversar',
                'welcome.encrypted_messages': 'Mensajes cifrados',
                'welcome.real_time': 'Tiempo real',
                'welcome.reactions': 'Reacciones',
                
                // Chat Header
                'chat.back': 'Volver',
                'chat.search_in_chat': 'Buscar en chat',
                'chat.call': 'Llamar',
                'chat.video_call': 'Videollamada',
                'chat.search_messages': 'Buscar mensajes...',
                'chat.previous_result': 'Resultado anterior',
                'chat.next_result': 'Siguiente resultado',
                'chat.close_search': 'Cerrar búsqueda',
                
                // Message Input
                'chat.attachments': 'Adjuntos',
                'chat.type_message': 'Escribe un mensaje...',
                'chat.send': 'Enviar',
                'chat.record_voice': 'Grabar mensaje de voz',
                
                // Attachment Options
                'attachment.emojis': 'Emojis',
                'attachment.camera': 'Cámara',
                'attachment.gallery': 'Galería',
                'attachment.location': 'Ubicación',
                'attachment.document': 'Documento',
                
                // Modals
                'modal.add_contact_title': 'Agregar contacto',
                'modal.search_user': 'Buscar usuario:',
                'modal.username_or_email': 'Nombre de usuario o correo',
                'modal.cancel': 'Cancelar',
                'modal.settings_title': 'Configuración',
                'modal.profile_tab': 'Perfil',
                'modal.privacy_tab': 'Privacidad',
                'modal.notifications_tab': 'Notificaciones',
                'modal.appearance_tab': 'Apariencia',
                
                // Chat Status
                'chat.online': 'En línea',
                'chat.offline': 'Desconectado',
                'chat.typing': 'escribiendo...',
                'chat.last_seen': 'Última vez hace',
                
                // Buttons
                'buttons.send': 'Enviar',
                'buttons.cancel': 'Cancelar',
                'buttons.save': 'Guardar',
                'buttons.delete': 'Eliminar',
                'buttons.accept': 'Aceptar',
                'buttons.decline': 'Rechazar',
                'buttons.close': 'Cerrar',
                
                // Calls
                'calls.incoming': 'Llamada entrante',
                'calls.outgoing': 'Llamando...',
                'calls.accept': 'Aceptar',
                'calls.decline': 'Rechazar',
                'calls.end': 'Finalizar',
                'calls.mute': 'Silenciar micrófono',
                'calls.video': 'Activar/Desactivar video',
                'calls.switch_camera': 'Cambiar cámara',
                'calls.speaker': 'Altavoz',
                
                // Password Strength
                'password.weak': 'Débil',
                'password.fair': 'Regular',
                'password.good': 'Buena',
                'password.strong': 'Fuerte',
                
                // Navigation (Mobile)
                'nav.chat': 'Chat',
                'nav.contacts': 'Contactos',
                'nav.requests': 'Solicitudes',
                'nav.calls': 'Llamadas',
                
                // Notifications
                'notifications.welcome_back': '¡Bienvenido de vuelta!',
                'notifications.connection_restored': 'Conexión restaurada',
                'notifications.app_installed': 'App instalada correctamente',
                'notifications.connected_server': 'Conectado al servidor',
                'notifications.connection_restored': 'Conexión restablecida',
                'notifications.message_sent': 'Mensaje enviado',
                'notifications.contact_accepted': '{{contact}} aceptó tu solicitud',
                'notifications.file_uploaded': 'Archivo subido: {{filename}}',
                'notifications.account_created': '¡Cuenta creada exitosamente!',
                'notifications.otp_login_success': '¡Inicio de sesión con OTP exitoso!',
                'notifications.google_login_success': '¡Inicio de sesión con Google exitoso!',
                'notifications.device_verified': 'Dispositivo verificado exitosamente',
                'notifications.chat_cleared': 'Chat vaciado exitosamente',
                'notifications.message_copied': 'Mensaje copiado al portapapeles',
                'notifications.message_deleted': 'Mensaje eliminado',
                'notifications.contact_blocked': 'Contacto bloqueado correctamente',
                'notifications.contact_request_sent': 'Solicitud enviada a {{name}}',
                'notifications.contact_removed': 'Contacto eliminado correctamente',
                'notifications.contact_unblocked': '{{name}} ha sido desbloqueado',
                'notifications.session_kept_alive': 'Sesión mantenida activa',
                'notifications.copied_clipboard': 'Copiado al portapapeles',
                'notifications.language_changed': 'Idioma cambiado a {{language}}',
                'notifications.location_stopped': 'Dejaste de compartir tu ubicación',
                'notifications.field_updated': '{{field}} actualizado correctamente'
            },
            en: {
                // App Name
                'app_name': 'VigiChat',
                
                // Loading Screen
                'loading.connecting': 'Connecting...',
                
                // Auth - Login Form
                'auth.welcome_back': 'Welcome back',
                'auth.login_subtitle': 'Sign in to continue your conversations',
                'auth.email_placeholder': 'Email address',
                'auth.password_placeholder': 'Password',
                'auth.login_button': 'Sign In',
                'auth.or': 'or',
                'auth.google_login': 'Google',
                'auth.otp_login': 'Sign in with OTP',
                'auth.no_account': "Don't have an account?",
                'auth.register_here': 'Sign up here',
                'auth.forgot_password': 'Forgot your password?',
                'auth.show_password': 'Show password',
                'auth.hide_password': 'Hide password',
                
                // Auth - Register Form
                'auth.create_account': 'Create account',
                'auth.register_subtitle': 'Join the best messaging platform',
                'auth.fullname_placeholder': 'Full name',
                'auth.password_min': 'Password (min. 6 characters)',
                'auth.create_button': 'Create Account',
                'auth.have_account': 'Already have an account?',
                'auth.login_here': 'Sign in',
                
                // Auth - Forgot Password
                'auth.recover_password': 'Recover password',
                'auth.recover_subtitle': 'Enter your email and we\'ll send you a link to reset your password',
                'auth.send_link': 'Send link',
                'auth.back_to_login': '← Back to sign in',
                
                // Auth - Reset Password
                'auth.new_password': 'New password',
                'auth.new_password_subtitle': 'Enter your new password',
                'auth.new_password_placeholder': 'New password (min. 6 characters)',
                'auth.confirm_password_placeholder': 'Confirm new password',
                'auth.passwords_match': 'Passwords match',
                'auth.reset_password_button': 'Reset password',
                
                // Auth - Success
                'auth.password_updated': 'Password updated!',
                'auth.password_success_subtitle': 'Your password has been reset successfully',
                'auth.return_login': 'Sign in',
                
                // Auth - Magic Link (OTP)
                'auth.otp_title': 'Sign in with OTP',
                'auth.otp_subtitle': 'Enter your email and we\'ll send you an OTP code to sign in without password',
                'auth.send_otp': 'Send OTP',
                'auth.back_to_login_magic': '← Back to sign in',
                
                // Mobile Header
                'mobile.menu': 'Main menu',
                
                // Sidebar
                'sidebar.chats': 'Chats',
                'sidebar.contacts': 'Contacts',
                'sidebar.requests': 'Requests',
                'sidebar.calls': 'Calls',
                'sidebar.search_chats': 'Search chats...',
                'sidebar.search_contacts': 'Search contacts...',
                'sidebar.add_contact': 'Add contact',
                'sidebar.recent_calls': 'Recent calls',
                'sidebar.no_recent_calls': 'No recent calls',
                'sidebar.calls_description': 'Calls you make or receive will appear here',
                
                // Main Menu
                'main_menu.profile_settings': 'Profile Settings',
                'main_menu.add_contact': 'Add Contact',
                'main_menu.blocked_contacts': 'Blocked Contacts',
                'main_menu.language': 'Language',
                'main_menu.help': 'Help',
                'main_menu.logout': 'Logout',
                
                // Welcome Screen
                'welcome.title': 'Welcome to VigiChat',
                'welcome.subtitle': 'Select a chat to start a conversation',
                'welcome.encrypted_messages': 'Encrypted messages',
                'welcome.real_time': 'Real time',
                'welcome.reactions': 'Reactions',
                
                // Chat Header
                'chat.back': 'Back',
                'chat.search_in_chat': 'Search in chat',
                'chat.call': 'Call',
                'chat.video_call': 'Video call',
                'chat.search_messages': 'Search messages...',
                'chat.previous_result': 'Previous result',
                'chat.next_result': 'Next result',
                'chat.close_search': 'Close search',
                
                // Message Input
                'chat.attachments': 'Attachments',
                'chat.type_message': 'Type a message...',
                'chat.send': 'Send',
                'chat.record_voice': 'Record voice message',
                
                // Attachment Options
                'attachment.emojis': 'Emojis',
                'attachment.camera': 'Camera',
                'attachment.gallery': 'Gallery',
                'attachment.location': 'Location',
                'attachment.document': 'Document',
                
                // Modals
                'modal.add_contact_title': 'Add contact',
                'modal.search_user': 'Search user:',
                'modal.username_or_email': 'Username or email',
                'modal.cancel': 'Cancel',
                'modal.settings_title': 'Settings',
                'modal.profile_tab': 'Profile',
                'modal.privacy_tab': 'Privacy',
                'modal.notifications_tab': 'Notifications',
                'modal.appearance_tab': 'Appearance',
                
                // Chat Status
                'chat.online': 'Online',
                'chat.offline': 'Offline',
                'chat.typing': 'typing...',
                'chat.last_seen': 'Last seen',
                
                // Buttons
                'buttons.send': 'Send',
                'buttons.cancel': 'Cancel',
                'buttons.save': 'Save',
                'buttons.delete': 'Delete',
                'buttons.accept': 'Accept',
                'buttons.decline': 'Decline',
                'buttons.close': 'Close',
                
                // Calls
                'calls.incoming': 'Incoming call',
                'calls.outgoing': 'Calling...',
                'calls.accept': 'Accept',
                'calls.decline': 'Decline',
                'calls.end': 'End call',
                'calls.mute': 'Mute microphone',
                'calls.video': 'Toggle video',
                'calls.switch_camera': 'Switch camera',
                'calls.speaker': 'Speaker',
                
                // Password Strength
                'password.weak': 'Weak',
                'password.fair': 'Fair',
                'password.good': 'Good',
                'password.strong': 'Strong',
                
                // Navigation (Mobile)
                'nav.chat': 'Chat',
                'nav.contacts': 'Contacts',
                'nav.requests': 'Requests',
                'nav.calls': 'Calls',
                
                // Notifications
                'notifications.welcome_back': 'Welcome back!',
                'notifications.connection_restored': 'Connection restored',
                'notifications.app_installed': 'App installed successfully',
                'notifications.connected_server': 'Connected to server',
                'notifications.connection_restored': 'Connection reestablished',
                'notifications.message_sent': 'Message sent',
                'notifications.contact_accepted': '{{contact}} accepted your request',
                'notifications.file_uploaded': 'File uploaded: {{filename}}',
                'notifications.account_created': 'Account created successfully!',
                'notifications.otp_login_success': 'OTP login successful!',
                'notifications.google_login_success': 'Google login successful!',
                'notifications.device_verified': 'Device verified successfully',
                'notifications.chat_cleared': 'Chat cleared successfully',
                'notifications.message_copied': 'Message copied to clipboard',
                'notifications.message_deleted': 'Message deleted',
                'notifications.contact_blocked': 'Contact blocked successfully',
                'notifications.contact_request_sent': 'Request sent to {{name}}',
                'notifications.contact_removed': 'Contact removed successfully',
                'notifications.contact_unblocked': '{{name}} has been unblocked',
                'notifications.session_kept_alive': 'Session kept alive',
                'notifications.copied_clipboard': 'Copied to clipboard',
                'notifications.language_changed': 'Language changed to {{language}}',
                'notifications.location_stopped': 'Stopped sharing your location',
                'notifications.field_updated': '{{field}} updated successfully'
            },
            fr: {
                // App Name
                'app_name': 'VigiChat',
                
                // Loading Screen
                'loading.connecting': 'Connexion...',
                
                // Auth - Login Form
                'auth.welcome_back': 'Bon retour',
                'auth.login_subtitle': 'Connectez-vous pour continuer vos conversations',
                'auth.email_placeholder': 'Adresse email',
                'auth.password_placeholder': 'Mot de passe',
                'auth.login_button': 'Se connecter',
                'auth.or': 'ou',
                'auth.google_login': 'Google',
                'auth.otp_login': 'Se connecter avec OTP',
                'auth.no_account': "Vous n'avez pas de compte ?",
                'auth.register_here': "S'inscrire ici",
                'auth.forgot_password': 'Mot de passe oublié ?',
                'auth.show_password': 'Afficher le mot de passe',
                'auth.hide_password': 'Masquer le mot de passe',
                
                // Auth - Register Form
                'auth.create_account': 'Créer un compte',
                'auth.register_subtitle': 'Rejoignez la meilleure plateforme de messagerie',
                'auth.fullname_placeholder': 'Nom complet',
                'auth.password_min': 'Mot de passe (min. 6 caractères)',
                'auth.create_button': 'Créer un compte',
                'auth.have_account': 'Vous avez déjà un compte ?',
                'auth.login_here': 'Se connecter',
                
                // Auth - Forgot Password
                'auth.recover_password': 'Récupérer le mot de passe',
                'auth.recover_subtitle': 'Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe',
                'auth.send_link': 'Envoyer le lien',
                'auth.back_to_login': '← Retour à la connexion',
                
                // Auth - Reset Password
                'auth.new_password': 'Nouveau mot de passe',
                'auth.new_password_subtitle': 'Entrez votre nouveau mot de passe',
                'auth.new_password_placeholder': 'Nouveau mot de passe (min. 6 caractères)',
                'auth.confirm_password_placeholder': 'Confirmer le nouveau mot de passe',
                'auth.passwords_match': 'Les mots de passe correspondent',
                'auth.reset_password_button': 'Réinitialiser le mot de passe',
                
                // Auth - Success
                'auth.password_updated': 'Mot de passe mis à jour !',
                'auth.password_success_subtitle': 'Votre mot de passe a été réinitialisé avec succès',
                'auth.return_login': 'Se connecter',
                
                // Auth - Magic Link (OTP)
                'auth.otp_title': 'Se connecter avec OTP',
                'auth.otp_subtitle': 'Entrez votre email et nous vous enverrons un code OTP pour vous connecter sans mot de passe',
                'auth.send_otp': 'Envoyer OTP',
                'auth.back_to_login_magic': '← Retour à la connexion',
                
                // Mobile Header
                'mobile.menu': 'Menu principal',
                
                // Sidebar
                'sidebar.chats': 'Conversations',
                'sidebar.contacts': 'Contacts',
                'sidebar.requests': 'Demandes',
                'sidebar.calls': 'Appels',
                'sidebar.search_chats': 'Rechercher des conversations...',
                'sidebar.search_contacts': 'Rechercher des contacts...',
                'sidebar.add_contact': 'Ajouter un contact',
                'sidebar.recent_calls': 'Appels récents',
                'sidebar.no_recent_calls': 'Aucun appel récent',
                'sidebar.calls_description': 'Les appels que vous passez ou recevez apparaîtront ici',
                
                // Main Menu
                'main_menu.profile_settings': 'Paramètres du profil',
                'main_menu.add_contact': 'Ajouter un contact',
                'main_menu.blocked_contacts': 'Contacts bloqués',
                'main_menu.language': 'Langue',
                'main_menu.help': 'Aide',
                'main_menu.logout': 'Se déconnecter',
                
                // Welcome Screen
                'welcome.title': 'Bienvenue sur VigiChat',
                'welcome.subtitle': 'Sélectionnez une conversation pour commencer',
                'welcome.encrypted_messages': 'Messages chiffrés',
                'welcome.real_time': 'Temps réel',
                'welcome.reactions': 'Réactions',
                
                // Chat Header
                'chat.back': 'Retour',
                'chat.search_in_chat': 'Rechercher dans la conversation',
                'chat.call': 'Appeler',
                'chat.video_call': 'Appel vidéo',
                'chat.search_messages': 'Rechercher des messages...',
                'chat.previous_result': 'Résultat précédent',
                'chat.next_result': 'Résultat suivant',
                'chat.close_search': 'Fermer la recherche',
                
                // Message Input
                'chat.attachments': 'Pièces jointes',
                'chat.type_message': 'Tapez un message...',
                'chat.send': 'Envoyer',
                'chat.record_voice': 'Enregistrer un message vocal',
                
                // Attachment Options
                'attachment.emojis': 'Emojis',
                'attachment.camera': 'Caméra',
                'attachment.gallery': 'Galerie',
                'attachment.location': 'Localisation',
                'attachment.document': 'Document',
                
                // Modals
                'modal.add_contact_title': 'Ajouter un contact',
                'modal.search_user': 'Rechercher un utilisateur :',
                'modal.username_or_email': "Nom d'utilisateur ou email",
                'modal.cancel': 'Annuler',
                'modal.settings_title': 'Paramètres',
                'modal.profile_tab': 'Profil',
                'modal.privacy_tab': 'Confidentialité',
                'modal.notifications_tab': 'Notifications',
                'modal.appearance_tab': 'Apparence',
                
                // Chat Status
                'chat.online': 'En ligne',
                'chat.offline': 'Hors ligne',
                'chat.typing': 'en train d\'écrire...',
                'chat.last_seen': 'Vu pour la dernière fois',
                
                // Buttons
                'buttons.send': 'Envoyer',
                'buttons.cancel': 'Annuler',
                'buttons.save': 'Sauvegarder',
                'buttons.delete': 'Supprimer',
                'buttons.accept': 'Accepter',
                'buttons.decline': 'Refuser',
                'buttons.close': 'Fermer',
                
                // Calls
                'calls.incoming': 'Appel entrant',
                'calls.outgoing': 'Appel en cours...',
                'calls.accept': 'Accepter',
                'calls.decline': 'Refuser',
                'calls.end': 'Raccrocher',
                'calls.mute': 'Couper le microphone',
                'calls.video': 'Basculer la vidéo',
                'calls.switch_camera': 'Changer de caméra',
                'calls.speaker': 'Haut-parleur',
                
                // Password Strength
                'password.weak': 'Faible',
                'password.fair': 'Moyen',
                'password.good': 'Bon',
                'password.strong': 'Fort',
                
                // Navigation (Mobile)
                'nav.chat': 'Chat',
                'nav.contacts': 'Contacts',
                'nav.requests': 'Demandes',
                'nav.calls': 'Appels'
            },
            ht: {
                // App Name
                'app_name': 'VigiChat',
                
                // Loading Screen
                'loading.connecting': 'Y ap konekte...',
                
                // Auth - Login Form
                'auth.welcome_back': 'Akeyi nan retou w',
                'auth.login_subtitle': 'Konekte pou ou kontinye pale ak moun yo',
                'auth.email_placeholder': 'Adrès imel',
                'auth.password_placeholder': 'Mo kòd',
                'auth.login_button': 'Konekte',
                'auth.or': 'oswa',
                'auth.google_login': 'Google',
                'auth.otp_login': 'Konekte ak OTP',
                'auth.no_account': 'Ou pa gen kont?',
                'auth.register_here': 'Kreye kont isit la',
                'auth.forgot_password': 'Ou bliye mo kòd ou?',
                'auth.show_password': 'Montre mo kòd',
                'auth.hide_password': 'Kache mo kòd',
                
                // Auth - Register Form
                'auth.create_account': 'Kreye kont',
                'auth.register_subtitle': 'Rantre nan pi bon platfòm mesaj la',
                'auth.fullname_placeholder': 'Non konplè',
                'auth.password_min': 'Mo kòd (minimum 6 lèt)',
                'auth.create_button': 'Kreye Kont',
                'auth.have_account': 'Ou deja gen yon kont?',
                'auth.login_here': 'Konekte',
                
                // Auth - Forgot Password
                'auth.recover_password': 'Jwenn mo kòd ankò',
                'auth.recover_subtitle': 'Ekri imel ou a, n ap voye yon lyen pou ou chanje mo kòd ou',
                'auth.send_link': 'Voye lyen',
                'auth.back_to_login': '← Retounen nan koneksyon',
                
                // Auth - Reset Password
                'auth.new_password': 'Nouvo mo kòd',
                'auth.new_password_subtitle': 'Ekri nouvo mo kòd ou',
                'auth.new_password_placeholder': 'Nouvo mo kòd (minimum 6 lèt)',
                'auth.confirm_password_placeholder': 'Konfime nouvo mo kòd',
                'auth.passwords_match': 'Mo kòd yo menm',
                'auth.reset_password_button': 'Chanje mo kòd',
                
                // Auth - Success
                'auth.password_updated': 'Mo kòd chanje!',
                'auth.password_success_subtitle': 'Mo kòd ou chanje kèk avèk siksè',
                'auth.return_login': 'Konekte',
                
                // Auth - Magic Link (OTP)
                'auth.otp_title': 'Konekte ak OTP',
                'auth.otp_subtitle': 'Ekri imel ou a, n ap voye yon kòd OTP pou ou konekte san mo kòd',
                'auth.send_otp': 'Voye OTP',
                'auth.back_to_login_magic': '← Retounen nan koneksyon',
                
                // Mobile Header
                'mobile.menu': 'Menu prensipal',
                
                // Sidebar
                'sidebar.chats': 'Pale',
                'sidebar.contacts': 'Kontak',
                'sidebar.requests': 'Demann',
                'sidebar.calls': 'Appèl',
                'sidebar.search_chats': 'Chèche nan pale yo...',
                'sidebar.search_contacts': 'Chèche kontak...',
                'sidebar.add_contact': 'Ajoute kontak',
                'sidebar.recent_calls': 'Appèl resan yo',
                'sidebar.no_recent_calls': 'Pa gen appèl resan',
                'sidebar.calls_description': 'Appèl ou fè oswa resevwa yo ap parèt isit la',
                
                // Main Menu
                'main_menu.profile_settings': 'Paramèt pwofil yo',
                'main_menu.add_contact': 'Ajoute kontak',
                'main_menu.blocked_contacts': 'Kontak yo bloke',
                'main_menu.language': 'Lang',
                'main_menu.help': 'Èd',
                'main_menu.logout': 'Soti',
                
                // Welcome Screen
                'welcome.title': 'Byenvini nan VigiChat',
                'welcome.subtitle': 'Chwazi yon konvèsasyon pou kòmanse',
                'welcome.encrypted_messages': 'Mesaj kode',
                'welcome.real_time': 'Tan reyèl',
                'welcome.reactions': 'Reyaksyon',
                
                // Chat Header
                'chat.back': 'Retounen',
                'chat.search_in_chat': 'Chèche nan konvèsasyon',
                'chat.call': 'Rele',
                'chat.video_call': 'Appèl videyo',
                'chat.search_messages': 'Chèche mesaj...',
                'chat.previous_result': 'Rezilta anvan an',
                'chat.next_result': 'Rezilta swivan an',
                'chat.close_search': 'Fèmen rechèch',
                
                // Message Input
                'chat.attachments': 'Dokiman yo',
                'chat.type_message': 'Ekri yon mesaj...',
                'chat.send': 'Voye',
                'chat.record_voice': 'Anrejistre mesaj vwa',
                
                // Attachment Options
                'attachment.emojis': 'Emoji',
                'attachment.camera': 'Kamera',
                'attachment.gallery': 'Galri',
                'attachment.location': 'Kote ou ye',
                'attachment.document': 'Dokiman',
                
                // Modals
                'modal.add_contact_title': 'Ajoute kontak',
                'modal.search_user': 'Chèche itilizatè:',
                'modal.username_or_email': 'Non itilizatè oswa imel',
                'modal.cancel': 'Anile',
                'modal.settings_title': 'Paramèt',
                'modal.profile_tab': 'Pwofil',
                'modal.privacy_tab': 'Vi prive',
                'modal.notifications_tab': 'Notifikasyon',
                'modal.appearance_tab': 'Aparans',
                
                // Chat Status
                'chat.online': 'Sou entènèt',
                'chat.offline': 'Pa konekte',
                'chat.typing': 'y ap ekri...',
                'chat.last_seen': 'Te wè dènye fwa',
                
                // Buttons
                'buttons.send': 'Voye',
                'buttons.cancel': 'Anile',
                'buttons.save': 'Sovgade',
                'buttons.delete': 'Efase',
                'buttons.accept': 'Aksepte',
                'buttons.decline': 'Refize',
                'buttons.close': 'Fèmen',
                
                // Calls
                'calls.incoming': 'Appèl k ap antre',
                'calls.outgoing': 'Y ap rele...',
                'calls.accept': 'Aksepte',
                'calls.decline': 'Refize',
                'calls.end': 'Fini appèl la',
                'calls.mute': 'Fèmen mikwofòn',
                'calls.video': 'Chanje videyo',
                'calls.switch_camera': 'Chanje kamera',
                'calls.speaker': 'Wo-palè',
                
                // Password Strength
                'password.weak': 'Feb',
                'password.fair': 'Regilye',
                'password.good': 'Bon',
                'password.strong': 'Fò',
                
                // Navigation (Mobile)
                'nav.chat': 'Pale',
                'nav.contacts': 'Kontak',
                'nav.requests': 'Demann',
                'nav.calls': 'Appèl'
            }
        };
        
        return fallback[this.currentLanguage] || fallback.es;
    }
    
    // Obtener traducción
    t(key, params = {}) {
        const translation = this.translations[key] || key;
        
        // Reemplazar parámetros si los hay
        return Object.keys(params).reduce((str, param) => {
            return str.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
        }, translation);
    }
    
    // Cambiar idioma
    async changeLanguage(languageCode) {
        if (!this.supportedLanguages[languageCode]) {
            console.error(`❌ Unsupported language: ${languageCode}`);
            return false;
        }
        
        console.log(`🌐 Changing language from ${this.currentLanguage} to ${languageCode}`);
        
        this.currentLanguage = languageCode;
        localStorage.setItem('vigichat-language', languageCode);
        
        // Recargar traducciones
        await this.loadTranslations();
        
        // Aplicar traducciones
        this.applyTranslations();
        
        // Disparar evento personalizado
        const event = new CustomEvent('languageChanged', {
            detail: {
                language: languageCode,
                languageInfo: this.supportedLanguages[languageCode]
            }
        });
        document.dispatchEvent(event);
        
        // Mostrar notificación de cambio de idioma
        this.showLanguageChangeNotification(this.supportedLanguages[languageCode]);
        
        console.log(`✅ Language changed to: ${languageCode}`);
        return true;
    }
    
    // Aplicar traducciones al DOM
    applyTranslations() {
        console.log('🌐 Applying translations...', this.translations);
        
        // Actualizar el atributo lang del HTML para accesibilidad
        document.documentElement.lang = this.currentLanguage;
        
        // Buscar elementos con data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Solo actualizar si la traducción es diferente de la clave
            if (translation !== key) {
                // Determinar si actualizar textContent o placeholder
                if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'email' || element.type === 'password')) {
                    element.placeholder = translation;
                } else if (element.tagName === 'INPUT' && element.type === 'submit') {
                    element.value = translation;
                } else {
                    element.textContent = translation;
                }
                console.log(`✅ Translated ${key} -> ${translation}`);
            } else {
                console.warn(`⚠️ No translation found for key: ${key}`);
            }
        });
        
        // Actualizar placeholders específicos
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation !== key) {
                element.placeholder = translation;
                console.log(`✅ Translated placeholder ${key} -> ${translation}`);
            }
        });
        
        // Actualizar atributos title y aria-label
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation !== key) {
                element.title = translation;
                console.log(`✅ Translated title ${key} -> ${translation}`);
            }
        });
        
        const ariaElements = document.querySelectorAll('[data-i18n-aria]');
        ariaElements.forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            const translation = this.t(key);
            if (translation !== key) {
                element.setAttribute('aria-label', translation);
                console.log(`✅ Translated aria-label ${key} -> ${translation}`);
            }
        });
        
        console.log(`✅ Applied ${elements.length} translations`);
    }
    
    // Obtener lista de idiomas soportados
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
    
    // Obtener idioma actual
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    // Detectar idioma del navegador de forma más precisa
    detectBrowserLanguage() {
        // Obtener todos los idiomas preferidos del navegador
        const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage || 'es'];
        
        console.log('🌐 Browser languages detected:', browserLanguages);
        
        // Verificar cada idioma preferido
        for (let browserLang of browserLanguages) {
            const langCode = browserLang.split('-')[0].toLowerCase();
            
            // Mapear códigos de idioma con variantes
            const langMapping = {
                'ht': 'ht', // Haitian Creole
                'fr': 'fr', // French (fr, fr-FR, fr-CA, etc.)
                'en': 'en', // English (en, en-US, en-GB, etc.)
                'es': 'es'  // Spanish (es, es-ES, es-MX, etc.)
            };
            
            const mappedLang = langMapping[langCode];
            
            // Si encontramos un idioma soportado, usarlo
            if (mappedLang && this.supportedLanguages[mappedLang]) {
                console.log(`🌐 Detected supported language: ${mappedLang} from ${browserLang}`);
                return mappedLang;
            }
        }
        
        // Fallback: detectar por región si es posible
        const primaryLang = browserLanguages[0] || 'es';
        const region = primaryLang.split('-')[1]?.toUpperCase();
        
        // Mapeo regional para casos especiales
        const regionalMapping = {
            'HT': 'ht',  // Haití -> Creole
            'CA': 'en',  // Canadá -> English (aunque podría ser francés en Quebec)
            'US': 'en',  // Estados Unidos -> English
            'GB': 'en',  // Reino Unido -> English
            'FR': 'fr',  // Francia -> French
            'BE': 'fr',  // Bélgica -> French (aunque podría ser holandés)
            'CH': 'fr',  // Suiza -> French (aunque podría ser alemán o italiano)
        };
        
        if (region && regionalMapping[region] && this.supportedLanguages[regionalMapping[region]]) {
            console.log(`🌐 Using regional mapping: ${region} -> ${regionalMapping[region]}`);
            return regionalMapping[region];
        }
        
        console.log('🌐 No supported language detected, defaulting to Spanish');
        return 'es'; // Default a español
    }
    
    // Mostrar notificación cuando se cambia el idioma manualmente
    showLanguageChangeNotification(languageInfo) {
        // Crear notificación de cambio
        const notification = document.createElement('div');
        notification.className = 'language-change-notification';
        notification.innerHTML = `
            <div class="lang-change-content">
                <i class="fas fa-check-circle"></i>
                <span class="lang-flag">${languageInfo.flag}</span>
                <span class="lang-text">${this.t('notifications.language_changed', {language: languageInfo.nativeName})}</span>
            </div>
        `;
        
        // Estilos inline para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(34, 197, 94, 0.95);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remove después de 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Inicializar con idioma del navegador si no hay preferencia guardada
    initWithBrowserLanguage() {
        const savedLanguage = localStorage.getItem('vigichat-language');
        if (!savedLanguage) {
            const detectedLang = this.detectBrowserLanguage();
            if (this.supportedLanguages[detectedLang]) {
                this.changeLanguage(detectedLang);
            }
        }
    }
}

// Instanciar y exportar globalmente
window.i18n = new I18nManager();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar inmediatamente para el proceso de login
        initializeI18nForLogin();
    });
} else {
    // Si el DOM ya está listo, inicializar inmediatamente
    initializeI18nForLogin();
}

// Función para inicializar i18n específicamente para login
function initializeI18nForLogin() {
    // Mostrar idioma detectado en consola para debugging
    const detectedLang = window.i18n.detectBrowserLanguage();
    console.log(`🌐 Browser language detected: ${detectedLang}`);
    
    // Aplicar traducciones inmediatamente para el login
    setTimeout(() => {
        window.i18n.applyTranslations();
        
        // Aplicar una segunda vez para elementos que se cargan tarde
        setTimeout(() => {
            window.i18n.applyTranslations();
            console.log('🌐 Login translations applied');
            
            // Mostrar notificación del idioma detectado
            showLanguageDetectionNotification();
        }, 300);
    }, 50);
}

// Mostrar notificación discreta del idioma detectado
function showLanguageDetectionNotification() {
    const currentLang = window.i18n.getCurrentLanguage();
    const langInfo = window.i18n.getSupportedLanguages()[currentLang];
    
    if (langInfo && !localStorage.getItem('vigichat-language-notification-shown')) {
        // Solo mostrar una vez por sesión
        localStorage.setItem('vigichat-language-notification-shown', 'true');
        
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = 'language-detection-notification';
        notification.innerHTML = `
            <div class="lang-notification-content">
                <span class="lang-flag">${langInfo.flag}</span>
                <span class="lang-text">Idioma detectado: ${langInfo.nativeName}</span>
                <button class="change-lang-btn" onclick="window.debugI18n.showSupportedLanguages()" title="Cambiar idioma">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        `;
        
        // Estilos inline para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(79, 70, 229, 0.95);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remove después de 4 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Función de conveniencia global para traducciones
window.t = (key, params) => window.i18n.t(key, params);

// Funciones de debugging globales
window.debugI18n = {
    // Mostrar todas las traducciones actuales
    showTranslations: () => {
        console.log('🌐 Current translations:', window.i18n.translations);
    },
    
    // Forzar aplicación de traducciones
    forceApply: () => {
        console.log('🌐 Force applying translations...');
        window.i18n.applyTranslations();
    },
    
    // Mostrar elementos con data-i18n
    showI18nElements: () => {
        const elements = document.querySelectorAll('[data-i18n]');
        console.log(`🌐 Found ${elements.length} elements with data-i18n:`);
        elements.forEach(el => {
            console.log(`- ${el.getAttribute('data-i18n')}: "${el.textContent}" (${el.tagName})`);
        });
    },
    
    // Cambiar idioma para testing
    changeLanguage: (lang) => {
        window.i18n.changeLanguage(lang);
    },
    
    // Detectar idioma del navegador
    detectBrowserLanguage: () => {
        const detected = window.i18n.detectBrowserLanguage();
        console.log('🌐 Browser language detection result:', detected);
        return detected;
    },
    
    // Mostrar idiomas soportados
    showSupportedLanguages: () => {
        console.log('🌐 Supported languages:', window.i18n.getSupportedLanguages());
    },
    
    // Resetear idioma (borrar localStorage y redetectar)
    resetLanguage: () => {
        localStorage.removeItem('vigichat-language');
        console.log('🌐 Language preference reset. Reloading page...');
        window.location.reload();
    },
    
    // Simular diferentes idiomas de navegador
    simulateBrowserLanguage: (languages) => {
        // Temporal override para testing
        const originalLanguages = navigator.languages;
        Object.defineProperty(navigator, 'languages', {
            value: languages,
            configurable: true
        });
        
        const detected = window.i18n.detectBrowserLanguage();
        console.log(`🌐 Simulated browser languages [${languages.join(', ')}] -> detected: ${detected}`);
        
        // Restore original
        Object.defineProperty(navigator, 'languages', {
            value: originalLanguages,
            configurable: true
        });
        
        return detected;
    }
};

console.log('🌐 I18n system loaded. Use window.debugI18n for debugging.');
console.log('🌐 Available debug commands:');
console.log('  - window.debugI18n.detectBrowserLanguage() : Detect browser language');
console.log('  - window.debugI18n.changeLanguage("en") : Change to English');
console.log('  - window.debugI18n.changeLanguage("fr") : Change to French'); 
console.log('  - window.debugI18n.changeLanguage("ht") : Change to Haitian Creole');
console.log('  - window.debugI18n.changeLanguage("es") : Change to Spanish');
console.log('  - window.debugI18n.resetLanguage() : Reset language and redetect');
console.log('  - window.debugI18n.showSupportedLanguages() : Show all supported languages');
console.log('  - window.debugI18n.simulateBrowserLanguage(["fr-FR", "en"]) : Simulate browser languages');