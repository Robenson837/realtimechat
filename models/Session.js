const mongoose = require('mongoose');
const crypto = require('crypto');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sessionToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    refreshToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    deviceInfo: {
        userAgent: {
            type: String,
            required: true
        },
        browser: {
            name: String,
            version: String
        },
        os: {
            name: String,
            version: String
        },
        deviceType: {
            type: String,
            enum: ['desktop', 'mobile', 'tablet', 'unknown'],
            default: 'unknown'
        },
        fingerprint: {
            type: String,
            required: true
        }
    },
    location: {
        ip: {
            type: String,
            required: true
        },
        country: String,
        region: String,
        city: String,
        coordinates: {
            lat: Number,
            lon: Number
        },
        timezone: String
    },
    security: {
        isNewDevice: {
            type: Boolean,
            default: true
        },
        isSuspicious: {
            type: Boolean,
            default: false
        },
        riskScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        verifiedAt: Date,
        twoFactorUsed: {
            type: Boolean,
            default: false
        }
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'revoked', 'suspicious'],
        default: 'active'
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index for automatic cleanup
    },
    refreshExpiresAt: {
        type: Date,
        required: true
    },
    metadata: {
        loginMethod: {
            type: String,
            enum: ['password', '2fa', 'social', 'biometric'],
            default: 'password'
        },
        sessionDuration: Number, // in seconds
        activityCount: {
            type: Number,
            default: 1
        },
        lastIpChange: Date,
        lastDeviceChange: Date
    }
}, {
    timestamps: true
});

// Indexes for performance
sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ 'deviceInfo.fingerprint': 1 });
sessionSchema.index({ 'location.ip': 1 });
sessionSchema.index({ lastActivity: -1 });
sessionSchema.index({ createdAt: -1 });

// Generate secure session token
sessionSchema.statics.generateSessionToken = function() {
    return crypto.randomBytes(32).toString('hex');
};

// Generate secure refresh token
sessionSchema.statics.generateRefreshToken = function() {
    return crypto.randomBytes(48).toString('hex');
};

// Generate device fingerprint
sessionSchema.statics.generateFingerprint = function(userAgent, ip, additionalData = {}) {
    const data = {
        userAgent,
        ip,
        ...additionalData
    };
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

// Parse user agent for device info
sessionSchema.statics.parseUserAgent = function(userAgent) {
    const browserRegex = /(Chrome|Firefox|Safari|Edge|Opera)\/?([\d.]+)?/i;
    const osRegex = /(Windows|Mac|Linux|Android|iOS)/i;
    const mobileRegex = /(Mobile|Tablet|iPad|iPhone|Android)/i;
    
    const browserMatch = userAgent.match(browserRegex);
    const osMatch = userAgent.match(osRegex);
    const isMobile = mobileRegex.test(userAgent);
    
    let deviceType = 'desktop';
    if (isMobile) {
        deviceType = /Tablet|iPad/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    
    return {
        browser: {
            name: browserMatch ? browserMatch[1] : 'Unknown',
            version: browserMatch ? browserMatch[2] : 'Unknown'
        },
        os: {
            name: osMatch ? osMatch[1] : 'Unknown',
            version: 'Unknown'
        },
        deviceType
    };
};

// Calculate risk score based on various factors
sessionSchema.methods.calculateRiskScore = function() {
    let riskScore = 0;
    
    // New device increases risk
    if (this.security.isNewDevice) {
        riskScore += 20;
    }
    
    // Time-based risk (login at unusual hours)
    const hour = new Date(this.createdAt).getHours();
    if (hour < 6 || hour > 23) {
        riskScore += 10;
    }
    
    // Multiple rapid logins from different IPs
    // This would require checking other sessions - simplified for now
    
    // Geographic distance (if we have previous sessions)
    // This would require geolocation comparison - simplified for now
    
    // Suspicious user agent patterns
    if (this.deviceInfo.userAgent.includes('curl') || 
        this.deviceInfo.userAgent.includes('wget') ||
        this.deviceInfo.userAgent.includes('bot')) {
        riskScore += 50;
    }
    
    // Very old or very new browser versions might be suspicious
    if (this.deviceInfo.browser.name === 'Unknown') {
        riskScore += 15;
    }
    
    this.security.riskScore = Math.min(riskScore, 100);
    return this.security.riskScore;
};

// Check if session is valid and active
sessionSchema.methods.isValid = function() {
    return this.status === 'active' && 
           new Date() < this.expiresAt && 
           !this.security.isSuspicious;
};

// Check if refresh token is valid
sessionSchema.methods.isRefreshValid = function() {
    return this.status === 'active' && 
           new Date() < this.refreshExpiresAt;
};

// Update last activity
sessionSchema.methods.updateActivity = function() {
    this.lastActivity = new Date();
    this.metadata.activityCount += 1;
    return this.save();
};

// Mark as suspicious and revoke
sessionSchema.methods.markSuspicious = function(reason) {
    this.security.isSuspicious = true;
    this.status = 'suspicious';
    this.metadata.suspiciousReason = reason;
    return this.save();
};

// Revoke session - Delete from database (standard approach)
sessionSchema.methods.revoke = async function(reason) {
    console.log(`Revoking and deleting session ${this._id} - Reason: ${reason}`);
    
    // Before deleting, update user's lastSeen if this is the user's logout
    if (reason === 'User logout' && this.userId) {
        try {
            const User = require('./User'); // Import User model
            await User.findByIdAndUpdate(this.userId, {
                lastSeen: new Date(),
                status: 'offline' // Immediate offline on logout
            });
            console.log(`Updated lastSeen for user ${this.userId} - immediate offline on logout`);
        } catch (error) {
            console.error('Error updating user lastSeen on session revoke:', error);
        }
    }
    
    // Delete the session from database (standard approach)
    return this.deleteOne();
};

// Get session info for client
sessionSchema.methods.getClientInfo = function() {
    return {
        id: this._id,
        deviceInfo: {
            browser: this.deviceInfo.browser,
            os: this.deviceInfo.os,
            deviceType: this.deviceInfo.deviceType
        },
        location: {
            country: this.location.country,
            region: this.location.region,
            city: this.location.city
        },
        security: {
            isNewDevice: this.security.isNewDevice,
            riskScore: this.security.riskScore,
            twoFactorUsed: this.security.twoFactorUsed
        },
        lastActivity: this.lastActivity,
        createdAt: this.createdAt,
        isCurrent: false // Will be set by calling code
    };
};

// Static method to find active sessions for user
sessionSchema.statics.findActiveSessions = function(userId) {
    return this.find({
        userId: userId,
        status: 'active',
        expiresAt: { $gt: new Date() }
    }).sort({ lastActivity: -1 });
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
    return this.updateMany(
        { 
            expiresAt: { $lte: new Date() },
            status: 'active'
        },
        { 
            status: 'expired'
        }
    );
};

// Pre-save middleware to calculate risk score
sessionSchema.pre('save', function(next) {
    if (this.isNew) {
        this.calculateRiskScore();
    }
    next();
});

module.exports = mongoose.model('Session', sessionSchema);