const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const { getModels } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'vigichat-secret-key-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vigichat-encryption-key-32-chars-long';

// Session token duration (15 minutes)
const SESSION_DURATION = 15 * 60 * 1000;
// Refresh token duration (30 days)
const REFRESH_DURATION = 30 * 24 * 60 * 60 * 1000;

class TokenService {
    /**
     * Generate a secure, random session token
     */
    static generateSessionToken() {
        // Generate 32 random bytes and convert to hex
        const randomBytes = crypto.randomBytes(32);
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        
        // Combine timestamp and random data for uniqueness
        return `${timestamp}.${random}.${randomBytes.toString('hex')}`;
    }

    /**
     * Generate a secure refresh token
     */
    static generateRefreshToken() {
        // Generate 48 random bytes for extra security
        const randomBytes = crypto.randomBytes(48);
        const timestamp = Date.now().toString(36);
        const userId = crypto.randomBytes(4).toString('hex');
        
        return `${timestamp}.${userId}.${randomBytes.toString('hex')}`;
    }

    /**
     * Hash token for storage in database (one-way hash for security)
     */
    static hashToken(token) {
        try {
            // Use HMAC-SHA256 for deterministic hashing
            const hash = CryptoJS.HmacSHA256(token, ENCRYPTION_KEY).toString();
            return hash;
        } catch (error) {
            console.error('Token hashing failed:', error);
            throw new Error('Failed to hash token');
        }
    }

    /**
     * Encrypt token for storage (for refresh tokens we need to decrypt them)
     */
    static encryptToken(token) {
        try {
            // Use deterministic encryption by providing a fixed IV derived from the token
            const iv = CryptoJS.SHA256(token + ENCRYPTION_KEY).toString().substring(0, 32);
            const encrypted = CryptoJS.AES.encrypt(token, ENCRYPTION_KEY, {
                iv: CryptoJS.enc.Hex.parse(iv),
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }).toString();
            return encrypted;
        } catch (error) {
            console.error('Token encryption failed:', error);
            throw new Error('Failed to encrypt token');
        }
    }

    /**
     * Decrypt token from database
     */
    static decryptToken(encryptedToken) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Token decryption failed:', error);
            throw new Error('Failed to decrypt token');
        }
    }

    /**
     * Create a new session with tokens - MULTI-SESSION WITH DEVICE VALIDATION
     */
    static async createSession(userId, deviceInfo, locationInfo, options = {}) {
        try {
            const { Session } = getModels();
            
            // Check if there's an existing active session for this device fingerprint
            const existingSession = await Session.findOne({
                userId: userId,
                status: 'active',
                'deviceInfo.fingerprint': deviceInfo.fingerprint,
                'deviceInfo.browser.name': deviceInfo.browser?.name,
                'deviceInfo.os.name': deviceInfo.os?.name
            });

            // If we found an existing session for the same device, reuse it
            if (existingSession) {
                console.log('Reusing existing session for same device:', existingSession._id);
                
                // Update the existing session activity and tokens
                const sessionToken = this.generateSessionToken();
                const refreshToken = this.generateRefreshToken();
                const hashedSessionToken = this.hashToken(sessionToken);
                const encryptedRefreshToken = this.encryptToken(refreshToken);

                existingSession.sessionToken = hashedSessionToken;
                existingSession.refreshToken = encryptedRefreshToken;
                existingSession.lastActivity = new Date();
                existingSession.activityCount = (existingSession.activityCount || 0) + 1;
                existingSession.ip = locationInfo.ip;
                existingSession.expiresAt = new Date(Date.now() + SESSION_DURATION);
                existingSession.refreshExpiresAt = new Date(Date.now() + REFRESH_DURATION);

                await existingSession.save();

                return {
                    session: existingSession,
                    sessionToken,
                    refreshToken,
                    isExistingDevice: true
                };
            }

            // For new devices, we'll create a new session but NOT revoke existing ones
            console.log('Creating new session for new device/browser combination');
            
            // Generate tokens
            const sessionToken = this.generateSessionToken();
            const refreshToken = this.generateRefreshToken();
            
            // Hash session token (one-way) and encrypt refresh token (two-way)
            const hashedSessionToken = this.hashToken(sessionToken);
            const encryptedRefreshToken = this.encryptToken(refreshToken);
            
            // Parse device info
            const parsedDeviceInfo = Session.parseUserAgent(deviceInfo.userAgent);
            const fingerprint = Session.generateFingerprint(
                deviceInfo.userAgent, 
                locationInfo.ip,
                { screen: deviceInfo.screen, timezone: deviceInfo.timezone }
            );
            
            // Check if this is a new device (checking revoked sessions too for this info)
            const allUserSessions = await Session.find({ userId: userId }).sort({ createdAt: -1 });
            const isNewDevice = !allUserSessions.some(session => 
                session.deviceInfo && session.deviceInfo.fingerprint === fingerprint
            );
            
            // Set expiration times - standard duration for multi-session support
            const expiresAt = new Date(Date.now() + SESSION_DURATION); // 15 minutes (as originally designed)
            const refreshExpiresAt = new Date(Date.now() + REFRESH_DURATION); // 30 days
            
            // Create new session for this device
            const session = new Session({
                userId,
                sessionToken: hashedSessionToken,
                refreshToken: encryptedRefreshToken,
                deviceInfo: {
                    userAgent: deviceInfo.userAgent,
                    browser: parsedDeviceInfo.browser,
                    os: parsedDeviceInfo.os,
                    deviceType: parsedDeviceInfo.deviceType,
                    fingerprint
                },
                location: {
                    ip: locationInfo.ip,
                    country: locationInfo.country,
                    region: locationInfo.region,
                    city: locationInfo.city,
                    coordinates: locationInfo.coordinates,
                    timezone: locationInfo.timezone
                },
                security: {
                    isNewDevice,
                    twoFactorUsed: options.twoFactorUsed || false
                },
                expiresAt,
                refreshExpiresAt,
                metadata: {
                    loginMethod: options.loginMethod || 'password'
                }
            });
            
            await session.save();
            
            return {
                sessionToken,
                refreshToken,
                session: session.toObject(),
                expiresAt,
                refreshExpiresAt,
                isNewDevice,
                isExistingDevice: false
            };
            
        } catch (error) {
            console.error('Create session failed:', error);
            throw new Error('Failed to create session');
        }
    }

    /**
     * Validate session token
     */
    static async validateSessionToken(sessionToken) {
        try {
            const { Session } = getModels();
            
            // Find session by hashed token
            const hashedToken = this.hashToken(sessionToken);
            const session = await Session.findOne({ 
                sessionToken: hashedToken,
                status: 'active'
            }).populate('userId', '-password -publicKey -deviceTokens');
            
            if (!session) {
                return { valid: false, reason: 'Session not found' };
            }
            
            // Check if session is valid
            if (!session.isValid()) {
                await session.revoke('Session expired or invalid');
                return { valid: false, reason: 'Session expired or invalid' };
            }
            
            // Update last activity
            await session.updateActivity();
            
            return {
                valid: true,
                session: session.toObject(),
                user: session.userId
            };
            
        } catch (error) {
            console.error('Session validation failed:', error);
            return { valid: false, reason: 'Validation error' };
        }
    }

    /**
     * Refresh session tokens
     */
    static async refreshSession(refreshToken) {
        try {
            const { Session } = getModels();
            
            // Find session by encrypted refresh token
            const encryptedRefreshToken = this.encryptToken(refreshToken);
            console.log('Refresh token search:', {
                refreshTokenPreview: refreshToken.substring(0, 20) + '...',
                encryptedPreview: encryptedRefreshToken.substring(0, 20) + '...'
            });
            
            const session = await Session.findOne({ 
                refreshToken: encryptedRefreshToken,
                status: 'active'
            }).populate('userId', '-password -publicKey -deviceTokens');
            
            if (!session) {
                return { success: false, reason: 'Refresh token not found' };
            }
            
            // Check if refresh token is valid
            if (!session.isRefreshValid()) {
                await session.revoke('Refresh token expired');
                return { success: false, reason: 'Refresh token expired' };
            }
            
            // Generate new session token
            const newSessionToken = this.generateSessionToken();
            
            // Update session - extend for longer duration since it's the only session
            session.sessionToken = this.hashToken(newSessionToken);
            session.expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours
            session.lastActivity = new Date();
            session.metadata.activityCount += 1;
            
            await session.save();
            
            return {
                success: true,
                sessionToken: newSessionToken,
                expiresAt: session.expiresAt,
                session: session.toObject()
            };
            
        } catch (error) {
            console.error('Session refresh failed:', error);
            return { success: false, reason: 'Refresh failed' };
        }
    }

    /**
     * Revoke session
     */
    static async revokeSession(sessionToken, reason = 'Manual revoke') {
        try {
            const { Session } = getModels();
            
            const hashedToken = this.hashToken(sessionToken);
            const session = await Session.findOne({ 
                sessionToken: hashedToken 
            });
            
            if (session) {
                await session.revoke(reason);
                return { success: true };
            }
            
            return { success: false, reason: 'Session not found' };
            
        } catch (error) {
            console.error('Session revocation failed:', error);
            return { success: false, reason: 'Revocation failed' };
        }
    }

    /**
     * Revoke all sessions for a user
     */
    static async revokeAllUserSessions(userId, exceptSessionId = null) {
        try {
            const { Session } = getModels();
            
            const query = { 
                userId, 
                status: 'active' 
            };
            
            if (exceptSessionId) {
                query._id = { $ne: exceptSessionId };
            }
            
            const result = await Session.updateMany(
                query,
                { 
                    status: 'revoked',
                    'metadata.revokedReason': 'All sessions revoked',
                    'metadata.revokedAt': new Date()
                }
            );
            
            return { 
                success: true, 
                revokedCount: result.modifiedCount 
            };
            
        } catch (error) {
            console.error('Revoke all sessions failed:', error);
            return { success: false, reason: 'Bulk revocation failed' };
        }
    }

    /**
     * Get all active sessions for a user
     */
    static async getUserSessions(userId) {
        try {
            const { Session } = getModels();
            
            const sessions = await Session.findActiveSessions(userId);
            
            return sessions.map(session => session.getClientInfo());
            
        } catch (error) {
            console.error('Get user sessions failed:', error);
            return [];
        }
    }

    /**
     * Clean up expired sessions
     */
    static async cleanupExpiredSessions() {
        try {
            const { Session } = getModels();
            
            const result = await Session.cleanupExpired();
            console.log(`Cleaned up ${result.modifiedCount} expired sessions`);
            
            return result;
            
        } catch (error) {
            console.error('Session cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Detect suspicious activity
     */
    static async detectSuspiciousActivity(userId, newSession) {
        try {
            const { Session } = getModels();
            
            // Get recent sessions (last 24 hours)
            const recentSessions = await Session.find({
                userId,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                status: { $in: ['active', 'expired', 'revoked'] }
            }).sort({ createdAt: -1 });
            
            const risks = [];
            
            // Check for rapid login attempts from different locations
            const uniqueCountries = new Set();
            const uniqueIPs = new Set();
            
            recentSessions.forEach(session => {
                if (session.location.country) {
                    uniqueCountries.add(session.location.country);
                }
                uniqueIPs.add(session.location.ip);
            });
            
            // Multiple countries in short time
            if (uniqueCountries.size > 2) {
                risks.push('Multiple countries detected');
            }
            
            // Multiple IPs in short time
            if (uniqueIPs.size > 5) {
                risks.push('Multiple IP addresses detected');
            }
            
            // Check for impossible travel
            if (recentSessions.length >= 2) {
                const latest = recentSessions[0];
                const previous = recentSessions[1];
                
                if (latest.location.country && 
                    previous.location.country && 
                    latest.location.country !== previous.location.country) {
                    
                    const timeDiff = (latest.createdAt - previous.createdAt) / (1000 * 60 * 60); // hours
                    if (timeDiff < 2) { // Less than 2 hours between different countries
                        risks.push('Impossible travel detected');
                    }
                }
            }
            
            // Update risk assessment
            if (risks.length > 0) {
                newSession.security.isSuspicious = true;
                newSession.security.riskScore = Math.min(newSession.security.riskScore + (risks.length * 25), 100);
                await newSession.save();
                
                return {
                    suspicious: true,
                    risks,
                    riskScore: newSession.security.riskScore
                };
            }
            
            return { suspicious: false, risks: [], riskScore: newSession.security.riskScore };
            
        } catch (error) {
            console.error('Suspicious activity detection failed:', error);
            return { suspicious: false, risks: [], riskScore: 0 };
        }
    }
}

module.exports = TokenService;