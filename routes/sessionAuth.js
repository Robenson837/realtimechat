const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getModels } = require('../models');
const TokenService = require('../services/tokenService');
const DeviceService = require('../services/deviceService');
const { sessionAuth, require2FA } = require('../middleware/sessionAuth');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Validation middleware
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

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

/**
 * @route   POST /api/session-auth/login
 * @desc    Enhanced login with session management
 * @access  Public
 */
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

        const { email, password, remember = false, twoFactorCode } = req.body;

        // Find user
        const { User } = getModels();
        const user = await User.findOne({ email });
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // TODO: Check 2FA if enabled
        const twoFactorUsed = !!twoFactorCode; // Placeholder for 2FA implementation

        // Extract device and location information
        const deviceInfo = DeviceService.extractDeviceInfo(req);
        const locationInfo = await DeviceService.getLocationFromIP(deviceInfo.ip);

        // Create session
        const sessionResult = await TokenService.createSession(
            user._id,
            deviceInfo,
            locationInfo,
            {
                twoFactorUsed,
                loginMethod: twoFactorUsed ? '2fa' : 'password'
            }
        );

        // Check for suspicious activity
        const { Session } = getModels();
        const userSessions = await Session.findActiveSessions(user._id);
        
        const suspiciousActivity = await TokenService.detectSuspiciousActivity(
            user._id,
            sessionResult.session
        );

        // Set cookies
        const sessionCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        };

        const refreshCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 30 days if remember, 7 days otherwise
            path: '/api/session-auth/refresh' // Only send with refresh requests
        };

        res.cookie('session_token', sessionResult.sessionToken, sessionCookieOptions);
        res.cookie('refresh_token', sessionResult.refreshToken, refreshCookieOptions);

        // Update user status
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();

        // Prepare response
        const responseData = {
            user: user.getPublicProfile(),
            session: {
                id: sessionResult.session._id,
                expiresAt: sessionResult.expiresAt,
                deviceInfo: {
                    browser: sessionResult.session.deviceInfo.browser,
                    os: sessionResult.session.deviceInfo.os,
                    deviceType: sessionResult.session.deviceInfo.deviceType
                },
                location: {
                    country: locationInfo.country,
                    region: locationInfo.region,
                    city: locationInfo.city
                },
                isNewDevice: sessionResult.isNewDevice
            },
            security: {
                suspicious: suspiciousActivity.suspicious,
                riskScore: suspiciousActivity.riskScore,
                risks: suspiciousActivity.risks
            }
        };

        // Send security alert if suspicious
        if (suspiciousActivity.suspicious) {
            console.warn('Suspicious login detected:', {
                userId: user._id,
                email: user.email,
                riskScore: suspiciousActivity.riskScore,
                risks: suspiciousActivity.risks,
                ip: deviceInfo.ip,
                userAgent: deviceInfo.userAgent
            });

            responseData.securityAlert = {
                message: 'Unusual login activity detected',
                requiresVerification: suspiciousActivity.riskScore > 70
            };

            // If very high risk, require additional verification
            if (suspiciousActivity.riskScore > 70) {
                return res.status(200).json({
                    success: true,
                    message: 'Additional verification required',
                    requiresVerification: true,
                    sessionId: sessionResult.session._id,
                    data: responseData
                });
            }
        }

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: responseData
        });

    } catch (error) {
        console.error('Enhanced login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor durante el inicio de sesión'
        });
    }
});

/**
 * @route   POST /api/session-auth/refresh
 * @desc    Refresh session token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;

        console.log('Refresh attempt:', {
            cookieToken: req.cookies?.refresh_token ? 'Present' : 'Missing',
            bodyToken: req.body.refreshToken ? 'Present' : 'Missing',
            allCookies: Object.keys(req.cookies || {}),
            refreshTokenValue: refreshToken ? refreshToken.substring(0, 20) + '...' : 'NULL/UNDEFINED'
        });

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token not provided',
                code: 'NO_REFRESH_TOKEN'
            });
        }

        console.log('Calling TokenService.refreshSession with token:', refreshToken.substring(0, 20) + '...');
        const refreshResult = await TokenService.refreshSession(refreshToken);

        if (!refreshResult.success) {
            // Clear invalid cookies
            res.clearCookie('session_token');
            res.clearCookie('refresh_token');

            return res.status(401).json({
                success: false,
                message: refreshResult.reason,
                code: 'REFRESH_FAILED'
            });
        }

        // Set new session token
        res.cookie('session_token', refreshResult.sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                expiresAt: refreshResult.expiresAt,
                session: {
                    id: refreshResult.session._id,
                    lastActivity: refreshResult.session.lastActivity
                }
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Error refreshing token'
        });
    }
});

/**
 * @route   POST /api/session-auth/logout
 * @desc    Logout and revoke session
 * @access  Private
 */
router.post('/logout', sessionAuth, async (req, res) => {
    try {
        const sessionToken = req.cookies?.session_token;

        if (sessionToken) {
            // This will delete the session from database and update user's lastSeen
            await TokenService.revokeSession(sessionToken, 'User logout');
        } else {
            // Fallback: if no session token, still update user status
            if (req.user) {
                req.user.status = 'offline';
                req.user.lastSeen = new Date();
                await req.user.save();
                console.log(`Fallback: Updated user ${req.user._id} status to offline`);
            }
        }

        // Clear cookies
        res.clearCookie('session_token');
        res.clearCookie('refresh_token');

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
});

/**
 * @route   POST /api/session-auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', sessionAuth, async (req, res) => {
    try {
        const currentSessionId = req.session?._id;

        const result = await TokenService.revokeAllUserSessions(
            req.user._id,
            currentSessionId
        );

        // Clear current session cookies
        res.clearCookie('session_token');
        res.clearCookie('refresh_token');

        res.json({
            success: true,
            message: `Logged out from ${result.revokedCount} devices`,
            data: {
                revokedSessions: result.revokedCount
            }
        });

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging out from all devices'
        });
    }
});

/**
 * @route   GET /api/session-auth/sessions
 * @desc    Get all active sessions for user
 * @access  Private
 */
router.get('/sessions', sessionAuth, async (req, res) => {
    try {
        const sessions = await TokenService.getUserSessions(req.user._id);
        
        // Mark current session
        const currentSessionId = req.session?._id?.toString();
        const sessionsWithCurrent = sessions.map(session => ({
            ...session,
            isCurrent: session.id === currentSessionId
        }));

        res.json({
            success: true,
            data: {
                sessions: sessionsWithCurrent,
                total: sessionsWithCurrent.length
            }
        });

    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving sessions'
        });
    }
});

/**
 * @route   DELETE /api/session-auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', sessionAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { Session } = getModels();

        // Find the session
        const session = await Session.findById(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if user owns this session
        if (session.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Revoke the session
        await session.revoke('Revoked by user');

        res.json({
            success: true,
            message: 'Session revoked successfully'
        });

    } catch (error) {
        console.error('Revoke session error:', error);
        res.status(500).json({
            success: false,
            message: 'Error revoking session'
        });
    }
});

/**
 * @route   GET /api/session-auth/verify
 * @desc    Verify current session
 * @access  Private
 */
router.get('/verify', sessionAuth, (req, res) => {
    res.json({
        success: true,
        message: 'Session is valid',
        data: {
            user: req.user.getPublicProfile(),
            session: {
                id: req.session._id,
                lastActivity: req.session.lastActivity,
                deviceInfo: {
                    browser: req.session.deviceInfo.browser,
                    os: req.session.deviceInfo.os,
                    deviceType: req.session.deviceInfo.deviceType
                },
                security: {
                    riskScore: req.session.security.riskScore,
                    isNewDevice: req.session.security.isNewDevice
                }
            }
        }
    });
});

/**
 * @route   POST /api/session-auth/verify-device
 * @desc    Verify device after suspicious activity
 * @access  Private (requires 2FA)
 */
router.post('/verify-device', sessionAuth, require2FA, async (req, res) => {
    try {
        const { verificationCode } = req.body;

        // TODO: Implement device verification logic
        // For now, just mark the session as verified

        if (req.session) {
            req.session.security.verifiedAt = new Date();
            req.session.security.isSuspicious = false;
            req.session.security.riskScore = Math.max(req.session.security.riskScore - 30, 0);
            await req.session.save();
        }

        res.json({
            success: true,
            message: 'Device verified successfully'
        });

    } catch (error) {
        console.error('Device verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying device'
        });
    }
});

/**
 * @route   POST /api/session-auth/verify-device
 * @desc    Verify device for cross-device session sharing
 * @access  Public (but requires session token and password)
 */
router.post('/verify-device', authLimiter, [
    body('sessionToken')
        .notEmpty()
        .withMessage('Session token is required'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required for device verification')
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

        const { sessionToken, email, password } = req.body;

        // Find user
        const { User } = getModels();
        const user = await User.findOne({ email });
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Validate the provided session token
        const sessionValidation = await TokenService.validateSessionToken(sessionToken);
        if (!sessionValidation.valid || sessionValidation.session.userId.toString() !== user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'Token de sesión inválido'
            });
        }

        // Extract current device info
        const deviceInfo = DeviceService.extractDeviceInfo(req);
        const locationInfo = await DeviceService.getLocationFromIP(deviceInfo.ip);

        // Check if this device already has a session for this user
        const existingDeviceSession = await TokenService.createSession(
            user._id,
            deviceInfo,
            locationInfo,
            { loginMethod: 'device_verification' }
        );

        // Set cookies for the new device
        const sessionCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        };

        const refreshCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/session-auth/refresh'
        };

        res.cookie('session_token', existingDeviceSession.sessionToken, sessionCookieOptions);
        res.cookie('refresh_token', existingDeviceSession.refreshToken, refreshCookieOptions);

        // Update user status
        user.status = 'online';
        await user.save();

        res.json({
            success: true,
            message: 'Dispositivo verificado exitosamente',
            data: {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    avatar: user.avatar,
                    status: user.status,
                    statusMessage: user.statusMessage
                },
                session: {
                    id: existingDeviceSession.session._id,
                    expiresAt: existingDeviceSession.expiresAt,
                    isNewDevice: existingDeviceSession.isNewDevice,
                    isExistingDevice: existingDeviceSession.isExistingDevice
                }
            }
        });

    } catch (error) {
        console.error('Device verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando dispositivo'
        });
    }
});

module.exports = router;