const jwt = require('jsonwebtoken');
const { getModels } = require('../models');
const TokenService = require('../services/tokenService');
const DeviceService = require('../services/deviceService');

const JWT_SECRET = process.env.JWT_SECRET || 'vigichat-secret-key-change-in-production';

/**
 * Enhanced authentication middleware with session management
 */
const sessionAuth = async (req, res, next) => {
    try {
        // Extract token from header or cookie
        let token = req.header('Authorization')?.replace('Bearer ', '');
        
        // If no header token, try cookie
        if (!token && req.cookies && req.cookies.session_token) {
            token = req.cookies.session_token;
        }
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        try {
            // Validate session token using TokenService
            const validation = await TokenService.validateSessionToken(token);
            
            if (!validation.valid) {
                // Try to refresh token if we have a refresh token
                const refreshToken = req.cookies?.refresh_token;
                
                if (refreshToken) {
                    const refreshResult = await TokenService.refreshSession(refreshToken);
                    
                    if (refreshResult.success) {
                        // Set new session token in cookie
                        res.cookie('session_token', refreshResult.sessionToken, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'strict',
                            maxAge: 15 * 60 * 1000 // 15 minutes
                        });
                        
                        req.user = refreshResult.session.userId;
                        req.session = refreshResult.session;
                        return next();
                    }
                }
                
                return res.status(401).json({ 
                    success: false, 
                    message: validation.reason || 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            }

            // Check for suspicious activity
            const { Session } = getModels();
            const userSessions = await Session.findActiveSessions(validation.user._id);
            
            const deviceInfo = DeviceService.extractDeviceInfo(req);
            const suspiciousCheck = await DeviceService.detectSuspiciousDevice(
                deviceInfo, 
                userSessions
            );
            
            if (suspiciousCheck.isSuspicious && suspiciousCheck.riskScore > 70) {
                // Mark session as suspicious and revoke
                await validation.session.markSuspicious('High risk activity detected');
                
                // Log security event
                console.warn('Suspicious session detected:', {
                    userId: validation.user._id,
                    sessionId: validation.session._id,
                    riskScore: suspiciousCheck.riskScore,
                    factors: suspiciousCheck.factors,
                    ip: deviceInfo.ip,
                    userAgent: deviceInfo.userAgent
                });
                
                return res.status(401).json({ 
                    success: false, 
                    message: 'Session terminated due to suspicious activity',
                    code: 'SUSPICIOUS_ACTIVITY'
                });
            }

            // All checks passed - user is authenticated
            req.user = validation.user;
            req.session = validation.session;
            req.deviceInfo = deviceInfo;
            
            next();
            
        } catch (jwtError) {
            console.error('Session authentication failed:', jwtError.message);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token signature.',
                code: 'TOKEN_ERROR'
            });
        }
    } catch (error) {
        console.error('Session auth middleware error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Authentication error.',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalSessionAuth = async (req, res, next) => {
    try {
        let token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token && req.cookies && req.cookies.session_token) {
            token = req.cookies.session_token;
        }
        
        if (!token) {
            // No token provided, continue without authentication
            return next();
        }

        const validation = await TokenService.validateSessionToken(token);
        
        if (validation.valid) {
            req.user = validation.user;
            req.session = validation.session;
            req.deviceInfo = DeviceService.extractDeviceInfo(req);
        }
        
        next();
    } catch (error) {
        console.error('Optional session auth error:', error);
        // Continue without authentication on error
        next();
    }
};

/**
 * Check if user has permission for specific action
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        // Check user permissions (implement based on your permission system)
        // For now, just check if user is active
        if (!req.user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated'
            });
        }
        
        next();
    };
};

/**
 * Require 2FA for sensitive operations
 */
const require2FA = async (req, res, next) => {
    try {
        if (!req.session) {
            return res.status(401).json({
                success: false,
                message: 'Session required'
            });
        }
        
        // Check if this session used 2FA
        if (!req.session.security.twoFactorUsed) {
            return res.status(403).json({
                success: false,
                message: '2FA verification required for this action',
                code: '2FA_REQUIRED'
            });
        }
        
        next();
    } catch (error) {
        console.error('2FA check error:', error);
        res.status(500).json({
            success: false,
            message: '2FA verification error'
        });
    }
};

/**
 * Rate limiting per session
 */
const sessionRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const sessionRequests = new Map();
    
    return (req, res, next) => {
        if (!req.session) {
            return next();
        }
        
        const sessionId = req.session._id.toString();
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        if (sessionRequests.has(sessionId)) {
            const requests = sessionRequests.get(sessionId);
            const validRequests = requests.filter(time => time > windowStart);
            sessionRequests.set(sessionId, validRequests);
        }
        
        // Check current requests
        const currentRequests = sessionRequests.get(sessionId) || [];
        
        if (currentRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests from this session'
            });
        }
        
        // Add current request
        currentRequests.push(now);
        sessionRequests.set(sessionId, currentRequests);
        
        next();
    };
};

/**
 * Legacy JWT token validation (for backward compatibility)
 */
const legacyJWTAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        const { User } = getModels();
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token or user not found.' 
            });
        }

        req.user = user;
        next();
        
    } catch (error) {
        console.error('Legacy JWT auth error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Invalid token.' 
        });
    }
};

module.exports = { 
    sessionAuth,
    optionalSessionAuth,
    requirePermission,
    require2FA,
    sessionRateLimit,
    legacyJWTAuth,
    // Alias for main auth function
    auth: sessionAuth
};