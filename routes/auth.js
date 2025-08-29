const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getModels } = require('../models');
const { generateToken } = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const router = express.Router();

// Dynamic URL detection based on environment
const getBaseURL = (req) => {
    // Check if we're on Railway (production)
    if (process.env.RAILWAY_ENVIRONMENT || req?.get('host')?.includes('railway.app')) {
        return 'https://vigichat.up.railway.app';
    }
    
    // Check for other production indicators
    if (process.env.NODE_ENV === 'production' && req?.get('host')) {
        const host = req.get('host');
        const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
        return `${protocol}://${host}`;
    }
    
    // Default to localhost for development
    return process.env.CLIENT_URL || 'http://localhost:3000';
};

// Configure Google OAuth Strategy with dynamic callback URL
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback" // Relative URL - will use current domain
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const { User } = getModels();
        
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            // User exists, return user
            return done(null, user);
        }
        
        // Check if user exists with same email
        const existingUser = await User.findOne({ email: profile.emails[0].value });
        
        if (existingUser) {
            // Link Google account to existing user
            existingUser.googleId = profile.id;
            await existingUser.save();
            return done(null, existingUser);
        }
        
        // Create new user
        const newUser = new User({
            googleId: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
            username: await generateUsernameFromEmail(profile.emails[0].value),
            avatar: profile.photos[0]?.value,
            isVerified: true // Google accounts are pre-verified
        });
        
        await newUser.save();
        return done(null, newUser);
        
    } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
    }
}));

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const { User } = getModels();
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Password reset tokens storage (in production, use Redis or database with TTL)
const resetTokens = new Map(); // email -> { token, expires, userId }

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, try again later.'
});

// Generate username from fullName
const generateUsername = async (fullName) => {
    const { User } = getModels();
    
    // Remove accents and special characters
    const cleanName = fullName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
    
    // Take first name and last name initial, or just first name
    const parts = cleanName.split(' ').filter(part => part.length > 0);
    let baseUsername = '';
    
    if (parts.length >= 2) {
        baseUsername = parts[0] + parts[parts.length - 1].charAt(0);
    } else if (parts.length === 1) {
        baseUsername = parts[0];
    }
    
    // Ensure base username is not empty and has minimum length
    if (baseUsername.length < 3) {
        baseUsername = 'user';
    }
    
    // Find unique username
    let username = baseUsername;
    let counter = Math.floor(Math.random() * 9999) + 1;
    
    while (await User.findOne({ username: username + counter })) {
        counter = Math.floor(Math.random() * 9999) + 1;
    }
    
    return username + counter;
};

const generateUsernameFromEmail = async (email) => {
    const { User } = getModels();
    
    // Extract name part from email (before @)
    const baseName = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
    
    if (baseName.length < 3) {
        return generateUsername('user');
    }
    
    // Find unique username
    let username = baseName;
    let counter = Math.floor(Math.random() * 9999) + 1;
    
    while (true) {
        const existingUser = await User.findOne({ username });
        if (!existingUser) {
            return username;
        }
        
        username = baseName + counter;
        counter++;
        
        // Prevent infinite loop
        if (counter > 99999) {
            return baseName + Date.now();
        }
    }
};

// Generate secure reset token
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Real email sending service
const createEmailTransporter = () => {
    // Check if we have email configuration
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        // Use Ethereal Email for testing
        return nodemailer.createTestAccount().then(testAccount => {
            console.log('📧 Using Ethereal Email for testing');
            console.log('Test account:', testAccount.user, testAccount.pass);
            
            return nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
        });
    }
};

const sendPasswordResetEmail = async (email, token, fullName = '') => {
    // Use production URL for password reset emails if available
    const baseUrl = process.env.RAILWAY_ENVIRONMENT 
        ? 'https://vigichat.up.railway.app' 
        : (process.env.CLIENT_URL || 'http://localhost:3000');
    const resetLink = `${baseUrl}/?token=${token}`;
    
    try {
        const transporter = await createEmailTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"VigiChat" <noreply@vigichat.com>',
            to: email,
            subject: 'Restablece tu contraseña - VigiChat',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">💬 VigiChat</h1>
                        </div>
                        <h2 style="color: #333; margin-bottom: 20px;">Restablece tu contraseña</h2>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">Hola${fullName ? ' ' + fullName : ''},</p>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                            Recibiste este correo porque solicitaste restablecer la contraseña de tu cuenta de VigiChat.
                            Haz clic en el botón de abajo para crear una nueva contraseña:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Restablecer Contraseña
                            </a>
                        </div>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                        </p>
                        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px;">
                            ${resetLink}
                        </p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 14px; margin-bottom: 10px;">⏰ Este enlace expira en 15 minutos por seguridad.</p>
                            <p style="color: #999; font-size: 14px; margin-bottom: 10px;">🔒 Si no solicitaste este cambio, puedes ignorar este correo.</p>
                            <p style="color: #999; font-size: 14px;">📧 Este es un correo automático, no responder.</p>
                        </div>
                    </div>
                </div>
            `,
            text: `VigiChat - Restablece tu contraseña\n\nHola${fullName ? ' ' + fullName : ''},\n\nRecibiste este correo porque solicitaste restablecer la contraseña de tu cuenta de VigiChat.\n\nHaz clic en este enlace para crear una nueva contraseña:\n${resetLink}\n\nEste enlace expira en 15 minutos por seguridad.\n\nSi no solicitaste este cambio, puedes ignorar este correo.\n\nVigiChat Team`
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Password reset email sent successfully');
        console.log('Message ID:', info.messageId);
        
        // If using Ethereal, show preview URL
        if (info.envelope && info.envelope.from && info.envelope.from.includes('ethereal')) {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
            console.log('🔗 Reset Link:', resetLink);
        }
        
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        throw new Error('Failed to send password reset email');
    }
};

const sendMagicLinkEmail = async (email, token, fullName = '') => {
    // The magic link should point to the backend server - detect environment
    const serverUrl = process.env.RAILWAY_ENVIRONMENT 
        ? 'https://vigichat.up.railway.app' 
        : (process.env.SERVER_URL || 'http://localhost:3000');
    const magicLink = `${serverUrl}/api/auth/magic-login/${token}`;
    
    try {
        const transporter = await createEmailTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"VigiChat" <noreply@vigichat.com>',
            to: email,
            subject: 'Tu código OTP para iniciar sesión - VigiChat',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">💬 VigiChat</h1>
                        </div>
                        <h2 style="color: #333; margin-bottom: 20px;">Iniciar sesión con OTP</h2>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">Hola${fullName ? ' ' + fullName : ''},</p>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                            Recibiste este correo porque solicitaste iniciar sesión con un código OTP en VigiChat.
                            Haz clic en el botón de abajo para iniciar sesión automáticamente:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${magicLink}" 
                               style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                🔐 Iniciar Sesión con OTP
                            </a>
                        </div>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                        </p>
                        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px;">
                            ${magicLink}
                        </p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 14px; margin-bottom: 10px;">⏰ Este enlace expira en 10 minutos por seguridad.</p>
                            <p style="color: #999; font-size: 14px; margin-bottom: 10px;">🔒 Si no solicitaste este código, puedes ignorar este correo.</p>
                            <p style="color: #999; font-size: 14px;">📧 Este es un correo automático, no responder.</p>
                        </div>
                    </div>
                </div>
            `,
            text: `VigiChat - Iniciar sesión con OTP\n\nHola${fullName ? ' ' + fullName : ''},\n\nRecibiste este correo porque solicitaste iniciar sesión con un código OTP en VigiChat.\n\nHaz clic en este enlace para iniciar sesión automáticamente:\n${magicLink}\n\nEste enlace expira en 10 minutos por seguridad.\n\nSi no solicitaste este código, puedes ignorar este correo.\n\nVigiChat Team`
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Magic link OTP email sent successfully');
        console.log('Message ID:', info.messageId);
        
        // If using Ethereal, show preview URL
        if (info.envelope && info.envelope.from && info.envelope.from.includes('ethereal')) {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
            console.log('🔗 Magic Link:', magicLink);
        }
        
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Magic link email sending failed:', error);
        throw new Error('Failed to send magic link email');
    }
};

// Validation middleware
const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('fullName')
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .trim()
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authLimiter, registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errors.array()
            });
        }

        const { email, password, fullName } = req.body;
        
        // Generate unique username from fullName
        const username = await generateUsername(fullName);

        // Check if user already exists
        const { User } = getModels();
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            fullName
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: user.getPublicProfile(),
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor durante el registro'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authLimiter, loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if user exists
        const { User } = getModels();
        const user = await User.findOne({ email });
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Update user status and last seen
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: {
                user: user.getPublicProfile(),
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor durante el inicio de sesión'
        });
    }
});

// @route   POST /api/auth/check-username
// @desc    Check if username is available
// @access  Public
router.post('/check-username', [
    body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid username format',
                errors: errors.array()
            });
        }

        const { username } = req.body;
        const { User } = getModels();
        const existingUser = await User.findOne({ username });

        res.json({
            success: true,
            available: !existingUser,
            message: existingUser ? 'Username already taken' : 'Username available'
        });

    } catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error checking username'
        });
    }
});

// @route   POST /api/auth/check-email
// @desc    Check if email is available
// @access  Public
router.post('/check-email', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
                errors: errors.array()
            });
        }

        const { email } = req.body;
        const { User } = getModels();
        const existingUser = await User.findOne({ email });

        res.json({
            success: true,
            available: !existingUser,
            message: existingUser ? 'Email already registered' : 'Email available'
        });

    } catch (error) {
        console.error('Email check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error checking email'
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', authLimiter, [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errors.array()
            });
        }

        const { email } = req.body;
        const { User } = getModels();
        const user = await User.findOne({ email });

        // Check if user exists first
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No existe una cuenta asociada a este correo electrónico'
            });
        }

        // Generate reset token
        const token = generateResetToken();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store token
        resetTokens.set(email, {
            token,
            expires,
            userId: user._id.toString()
        });

        // Send email (real email service)
        try {
            await sendPasswordResetEmail(email, token, user.fullName);
            
            // Clean up expired tokens periodically
            setTimeout(() => {
                if (resetTokens.has(email) && resetTokens.get(email).token === token) {
                    resetTokens.delete(email);
                }
            }, 15 * 60 * 1000);

            res.json({
                success: true,
                message: 'Se ha enviado un enlace de recuperación a tu correo electrónico'
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            
            // Clean up token if email failed
            resetTokens.delete(email);
            
            res.status(500).json({
                success: false,
                message: 'Error al enviar el correo electrónico. Intenta nuevamente'
            });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error processing password reset request'
        });
    }
});

// Storage for magic link tokens (in production, use Redis or database with TTL)
const magicLinkTokens = new Map(); // email -> { token, expires, userId }

// @route   POST /api/auth/magic-link
// @desc    Send magic link for passwordless login
// @access  Public
router.post('/magic-link', authLimiter, [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errors.array()
            });
        }

        const { email } = req.body;
        const { User } = getModels();
        const user = await User.findOne({ email });

        // Check if user exists first
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No existe una cuenta asociada a este correo electrónico'
            });
        }

        // Generate magic link token
        const token = generateResetToken(); // Reuse the same token generation function
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes for magic link

        // Store token
        magicLinkTokens.set(email, {
            token,
            expires,
            userId: user._id.toString()
        });

        // Send magic link email (using same email service as password reset)
        try {
            await sendMagicLinkEmail(email, token, user.fullName);
            
            // Clean up expired tokens periodically
            setTimeout(() => {
                if (magicLinkTokens.has(email) && magicLinkTokens.get(email).token === token) {
                    magicLinkTokens.delete(email);
                }
            }, 10 * 60 * 1000);

            res.json({
                success: true,
                message: 'Se ha enviado un código OTP a tu correo electrónico'
            });
        } catch (emailError) {
            console.error('Magic link email sending failed:', emailError);
            
            // Clean up token if email failed
            magicLinkTokens.delete(email);
            
            res.status(500).json({
                success: false,
                message: 'Error al enviar el código OTP. Intenta nuevamente'
            });
        }

    } catch (error) {
        console.error('Magic link error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error processing magic link request'
        });
    }
});

// @route   GET /api/auth/magic-login/:token
// @desc    Authenticate user with magic link token
// @access  Public
router.get('/magic-login/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token es requerido'
            });
        }

        // Find token data
        let tokenData = null;
        let userEmail = null;
        
        for (const [email, data] of magicLinkTokens.entries()) {
            if (data.token === token) {
                tokenData = data;
                userEmail = email;
                break;
            }
        }

        if (!tokenData) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        // Check if token has expired
        if (new Date() > tokenData.expires) {
            magicLinkTokens.delete(userEmail);
            return res.status(400).json({
                success: false,
                message: 'El enlace mágico ha expirado'
            });
        }

        // Get user
        const { User } = getModels();
        const user = await User.findById(tokenData.userId);
        if (!user) {
            magicLinkTokens.delete(userEmail);
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Generate JWT token for the user
        const jwtToken = generateToken(user._id);

        // Clean up magic link token
        magicLinkTokens.delete(userEmail);

        // Redirect to frontend with token as query parameter - dynamic URL
        const frontendUrl = process.env.RAILWAY_ENVIRONMENT 
            ? 'https://vigichat.up.railway.app' 
            : (process.env.CLIENT_URL || 'http://localhost:3000');
        res.redirect(`${frontendUrl}?token=${jwtToken}&magic_login=success`);

    } catch (error) {
        console.error('Magic login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error processing magic login'
        });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authLimiter, [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errors.array()
            });
        }

        const { token, password } = req.body;

        // Find token
        let resetData = null;
        let userEmail = null;
        
        for (const [email, data] of resetTokens.entries()) {
            if (data.token === token) {
                resetData = data;
                userEmail = email;
                break;
            }
        }

        if (!resetData) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Check if token expired
        if (new Date() > resetData.expires) {
            resetTokens.delete(userEmail);
            return res.status(400).json({
                success: false,
                message: 'Reset token has expired'
            });
        }

        // Find user and update password
        const { User } = getModels();
        const user = await User.findById(resetData.userId);
        if (!user) {
            resetTokens.delete(userEmail);
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update password
        user.password = password;
        await user.save();

        // Remove used token
        resetTokens.delete(userEmail);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error resetting password'
        });
    }
});

// @route   GET /api/auth/verify-reset-token/:token
// @desc    Verify if reset token is valid
// @access  Public
router.get('/verify-reset-token/:token', (req, res) => {
    try {
        const { token } = req.params;

        // Find token
        let resetData = null;
        let userEmail = null;
        
        for (const [email, data] of resetTokens.entries()) {
            if (data.token === token) {
                resetData = data;
                userEmail = email;
                break;
            }
        }

        if (!resetData || new Date() > resetData.expires) {
            if (resetData && userEmail) {
                resetTokens.delete(userEmail);
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.json({
            success: true,
            message: 'Token is valid'
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error verifying token'
        });
    }
});

// TEST ENDPOINT - Verificar JWT
router.get('/verify-jwt', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        console.log('Verify JWT endpoint - Token received:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
        
        if (!token) {
            return res.json({
                success: false,
                message: 'No token provided',
                debug: 'No Authorization header found'
            });
        }

        const { verifyToken } = require('../middleware/auth');
        const decoded = verifyToken(token);
        
        console.log('Verify JWT endpoint - Token decoded:', decoded);

        const { User } = getModels();
        const user = await User.findById(decoded.userId);
        
        res.json({
            success: true,
            message: 'Token is valid',
            debug: {
                decoded,
                user: user ? user.getPublicProfile() : null
            }
        });
    } catch (error) {
        console.error('Verify JWT endpoint - Error:', error);
        res.json({
            success: false,
            message: 'Token verification failed',
            error: error.message
        });
    }
});

// TEST ENDPOINT - Solo para desarrollo
router.post('/create-test-user', async (req, res) => {
    try {
        console.log('Creating test user...');
        const { User } = getModels();
        
        // Verificar si ya existe
        const existingUser = await User.findOne({ email: 'test@test.com' });
        if (existingUser) {
            console.log('Test user already exists');
            return res.json({
                success: true,
                message: 'Test user already exists',
                data: {
                    user: existingUser.getPublicProfile()
                }
            });
        }

        // Crear usuario de prueba
        const testUser = new User({
            username: 'testuser',
            email: 'test@test.com',
            password: '123456',
            fullName: 'Usuario de Prueba',
            isActive: true
        });

        await testUser.save();
        console.log('Test user created successfully');
        
        // Crear segundo usuario para testing
        const existingUser2 = await User.findOne({ email: 'rob@test.com' });
        if (!existingUser2) {
            const testUser2 = new User({
                username: 'rob',
                email: 'rob@test.com',
                password: '123456',
                fullName: 'Roberto Prueba',
                isActive: true
            });
            await testUser2.save();
            console.log('Second test user created');
        }

        res.json({
            success: true,
            message: 'Test user created successfully',
            data: {
                user: testUser.getPublicProfile()
            }
        });
    } catch (error) {
        console.error('Error creating test user:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating test user',
            error: error.message
        });
    }
});

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get('/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    async (req, res) => {
        try {
            // Generate JWT token for the authenticated user
            const token = generateToken(req.user._id);
            
            // Get dynamic frontend URL based on current environment
            const frontendUrl = getBaseURL(req);
            
            console.log(`🔐 Google Auth Success - Redirecting to: ${frontendUrl}`);
            res.redirect(`${frontendUrl}?token=${token}&google_login=success`);
            
        } catch (error) {
            console.error('Google callback error:', error);
            const frontendUrl = getBaseURL(req);
            res.redirect(`${frontendUrl}?error=google_auth_failed`);
        }
    }
);

module.exports = router;