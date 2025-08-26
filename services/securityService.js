const { getModels } = require('../models');
const DeviceService = require('./deviceService');
const TokenService = require('./tokenService');

class SecurityService {
    /**
     * Monitor and analyze user session patterns for security threats
     */
    static async analyzeUserSecurity(userId, currentSession = null) {
        try {
            const { Session, User } = getModels();
            
            // Get user and all their sessions
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            const userSessions = await Session.find({
                userId: userId,
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            }).sort({ createdAt: -1 });
            
            const analysis = {
                userId,
                overallRiskScore: 0,
                threats: [],
                recommendations: [],
                sessionAnalysis: {},
                patterns: {}
            };
            
            // Analyze session patterns
            analysis.patterns = this.analyzeSessionPatterns(userSessions);
            
            // Check for account takeover indicators
            const takeoverIndicators = this.checkAccountTakeoverIndicators(userSessions);
            if (takeoverIndicators.detected) {
                analysis.threats.push({
                    type: 'account_takeover',
                    severity: 'high',
                    description: 'Potential account takeover detected',
                    indicators: takeoverIndicators.indicators,
                    riskScore: 70
                });
                analysis.overallRiskScore += 70;
            }
            
            // Check for credential stuffing
            const credentialStuffing = this.checkCredentialStuffing(userSessions);
            if (credentialStuffing.detected) {
                analysis.threats.push({
                    type: 'credential_stuffing',
                    severity: 'medium',
                    description: 'Possible credential stuffing attempt',
                    indicators: credentialStuffing.indicators,
                    riskScore: 40
                });
                analysis.overallRiskScore += 40;
            }
            
            // Check for session hijacking
            const sessionHijacking = this.checkSessionHijacking(userSessions);
            if (sessionHijacking.detected) {
                analysis.threats.push({
                    type: 'session_hijacking',
                    severity: 'high',
                    description: 'Potential session hijacking detected',
                    indicators: sessionHijacking.indicators,
                    riskScore: 80
                });
                analysis.overallRiskScore += 80;
            }
            
            // Check for impossible travel
            const impossibleTravel = this.checkImpossibleTravel(userSessions);
            if (impossibleTravel.detected) {
                analysis.threats.push({
                    type: 'impossible_travel',
                    severity: 'high',
                    description: 'Impossible travel pattern detected',
                    indicators: impossibleTravel.indicators,
                    riskScore: 60
                });
                analysis.overallRiskScore += 60;
            }
            
            // Check for bot activity
            const botActivity = this.checkBotActivity(userSessions);
            if (botActivity.detected) {
                analysis.threats.push({
                    type: 'bot_activity',
                    severity: 'medium',
                    description: 'Automated/bot activity detected',
                    indicators: botActivity.indicators,
                    riskScore: 30
                });
                analysis.overallRiskScore += 30;
            }
            
            // Generate recommendations
            analysis.recommendations = this.generateSecurityRecommendations(analysis);
            
            // Cap the risk score
            analysis.overallRiskScore = Math.min(analysis.overallRiskScore, 100);
            
            return analysis;
            
        } catch (error) {
            console.error('Security analysis failed:', error);
            throw error;
        }
    }
    
    /**
     * Analyze session patterns for anomalies
     */
    static analyzeSessionPatterns(sessions) {
        const patterns = {
            totalSessions: sessions.length,
            uniqueDevices: new Set(sessions.map(s => s.deviceInfo.fingerprint)).size,
            uniqueCountries: new Set(sessions.map(s => s.location.country)).size,
            uniqueIPs: new Set(sessions.map(s => s.location.ip)).size,
            timePatterns: {},
            devicePatterns: {},
            locationPatterns: {}
        };
        
        // Analyze time patterns
        const hours = sessions.map(s => new Date(s.createdAt).getHours());
        patterns.timePatterns = {
            mostActiveHour: this.getMostFrequent(hours),
            unusualHourLogins: hours.filter(h => h < 6 || h > 23).length,
            hourDistribution: this.getHourDistribution(hours)
        };
        
        // Analyze device patterns
        const browsers = sessions.map(s => s.deviceInfo.browser.name);
        const oses = sessions.map(s => s.deviceInfo.os.name);
        patterns.devicePatterns = {
            browsers: this.getFrequencyMap(browsers),
            operatingSystems: this.getFrequencyMap(oses),
            newDeviceRate: sessions.filter(s => s.security.isNewDevice).length / sessions.length
        };
        
        // Analyze location patterns
        const countries = sessions.map(s => s.location.country);
        patterns.locationPatterns = {
            countries: this.getFrequencyMap(countries),
            primaryCountry: this.getMostFrequent(countries),
            foreignLoginRate: countries.filter(c => c !== this.getMostFrequent(countries)).length / sessions.length
        };
        
        return patterns;
    }
    
    /**
     * Check for account takeover indicators
     */
    static checkAccountTakeoverIndicators(sessions) {
        const indicators = [];
        let detected = false;
        
        // Multiple sessions from different countries in short time
        const recentSessions = sessions.filter(s => {
            const sessionTime = new Date(s.createdAt);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            return sessionTime > oneHourAgo;
        });
        
        const recentCountries = new Set(recentSessions.map(s => s.location.country));
        if (recentCountries.size > 2) {
            indicators.push(`Multiple countries (${recentCountries.size}) in one hour`);
            detected = true;
        }
        
        // Password change followed by multiple new device logins
        // (This would require integration with password change events)
        
        // Sudden change in device/browser patterns
        const recentDevices = recentSessions.map(s => s.deviceInfo.browser.name);
        const historicalDevices = sessions.slice(10).map(s => s.deviceInfo.browser.name); // Skip recent, look at historical
        
        if (historicalDevices.length > 0) {
            const newBrowsers = recentDevices.filter(b => !historicalDevices.includes(b));
            if (newBrowsers.length > 0 && recentDevices.length > 2) {
                indicators.push('Sudden change in browser patterns');
                detected = true;
            }
        }
        
        // High risk score sessions
        const highRiskSessions = sessions.filter(s => s.security.riskScore > 70);
        if (highRiskSessions.length > 2) {
            indicators.push(`${highRiskSessions.length} high-risk sessions detected`);
            detected = true;
        }
        
        return { detected, indicators };
    }
    
    /**
     * Check for credential stuffing attacks
     */
    static checkCredentialStuffing(sessions) {
        const indicators = [];
        let detected = false;
        
        // Multiple failed login attempts from different IPs
        // (This would require tracking failed attempts)
        
        // Rapid login attempts from sequential IPs
        const recentIPs = sessions
            .filter(s => {
                const sessionTime = new Date(s.createdAt);
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                return sessionTime > oneHourAgo;
            })
            .map(s => s.location.ip)
            .filter((ip, index, arr) => arr.indexOf(ip) === index); // unique IPs
        
        if (recentIPs.length > 5) {
            indicators.push(`${recentIPs.length} unique IPs in one hour`);
            detected = true;
        }
        
        // Automated user agents
        const suspiciousUAs = sessions.filter(s => {
            const ua = s.deviceInfo.userAgent.toLowerCase();
            return ua.includes('bot') || ua.includes('curl') || ua.includes('python');
        });
        
        if (suspiciousUAs.length > 0) {
            indicators.push('Automated user agents detected');
            detected = true;
        }
        
        return { detected, indicators };
    }
    
    /**
     * Check for session hijacking
     */
    static checkSessionHijacking(sessions) {
        const indicators = [];
        let detected = false;
        
        // Same session from different IPs
        const sessionGroups = {};
        sessions.forEach(session => {
            const sessionId = session._id.toString();
            if (!sessionGroups[sessionId]) {
                sessionGroups[sessionId] = [];
            }
            sessionGroups[sessionId].push(session.location.ip);
        });
        
        Object.entries(sessionGroups).forEach(([sessionId, ips]) => {
            const uniqueIPs = [...new Set(ips)];
            if (uniqueIPs.length > 1) {
                indicators.push(`Session ${sessionId} used from ${uniqueIPs.length} different IPs`);
                detected = true;
            }
        });
        
        // Sudden change in device characteristics mid-session
        // (This would require tracking session activity updates)
        
        return { detected, indicators };
    }
    
    /**
     * Check for impossible travel
     */
    static checkImpossibleTravel(sessions) {
        const indicators = [];
        let detected = false;
        
        // Sort sessions by creation time
        const sortedSessions = sessions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        for (let i = 1; i < sortedSessions.length; i++) {
            const currentSession = sortedSessions[i];
            const previousSession = sortedSessions[i - 1];
            
            const timeElapsed = new Date(currentSession.createdAt) - new Date(previousSession.createdAt);
            
            const travelCheck = DeviceService.checkImpossibleTravel(
                currentSession.location,
                previousSession.location,
                timeElapsed
            );
            
            if (travelCheck.impossible) {
                indicators.push(travelCheck.reason);
                detected = true;
            }
        }
        
        return { detected, indicators };
    }
    
    /**
     * Check for bot activity
     */
    static checkBotActivity(sessions) {
        const indicators = [];
        let detected = false;
        
        // Consistent timing patterns (too regular)
        const timeDiffs = [];
        for (let i = 1; i < sessions.length; i++) {
            const diff = new Date(sessions[i].createdAt) - new Date(sessions[i-1].createdAt);
            timeDiffs.push(diff);
        }
        
        if (timeDiffs.length > 3) {
            const avgDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
            const variance = timeDiffs.reduce((acc, diff) => acc + Math.pow(diff - avgDiff, 2), 0) / timeDiffs.length;
            const stdDev = Math.sqrt(variance);
            
            // Very low variance suggests automated timing
            if (stdDev < avgDiff * 0.1 && timeDiffs.length > 5) {
                indicators.push('Suspiciously consistent timing patterns');
                detected = true;
            }
        }
        
        // Suspicious user agents
        const botUAs = sessions.filter(s => {
            const ua = s.deviceInfo.userAgent.toLowerCase();
            return ua.includes('bot') || ua.includes('crawler') || ua.includes('spider') || 
                   ua.includes('curl') || ua.includes('wget') || ua.includes('python');
        });
        
        if (botUAs.length > 0) {
            indicators.push(`${botUAs.length} sessions with bot-like user agents`);
            detected = true;
        }
        
        // Too many requests per session
        const highActivitySessions = sessions.filter(s => s.metadata.activityCount > 1000);
        if (highActivitySessions.length > 0) {
            indicators.push(`${highActivitySessions.length} sessions with unusually high activity`);
            detected = true;
        }
        
        return { detected, indicators };
    }
    
    /**
     * Generate security recommendations
     */
    static generateSecurityRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.overallRiskScore > 50) {
            recommendations.push({
                type: 'immediate',
                action: 'Require password change',
                reason: 'High risk score detected'
            });
            
            recommendations.push({
                type: 'immediate',
                action: 'Enable 2FA if not already enabled',
                reason: 'Additional security layer needed'
            });
        }
        
        if (analysis.patterns.uniqueCountries > 3) {
            recommendations.push({
                type: 'review',
                action: 'Review login locations',
                reason: 'Logins from multiple countries detected'
            });
        }
        
        if (analysis.patterns.devicePatterns.newDeviceRate > 0.7) {
            recommendations.push({
                type: 'monitor',
                action: 'Monitor new device logins',
                reason: 'High rate of new device usage'
            });
        }
        
        // Check for specific threat types
        analysis.threats.forEach(threat => {
            switch (threat.type) {
                case 'account_takeover':
                    recommendations.push({
                        type: 'critical',
                        action: 'Force logout all devices and require verification',
                        reason: 'Potential account compromise'
                    });
                    break;
                    
                case 'impossible_travel':
                    recommendations.push({
                        type: 'urgent',
                        action: 'Verify recent login locations',
                        reason: 'Impossible travel pattern detected'
                    });
                    break;
                    
                case 'bot_activity':
                    recommendations.push({
                        type: 'monitor',
                        action: 'Implement CAPTCHA for suspicious sessions',
                        reason: 'Automated activity detected'
                    });
                    break;
            }
        });
        
        return recommendations;
    }
    
    /**
     * Execute automatic security actions
     */
    static async executeSecurityActions(userId, analysis) {
        const actions = [];
        
        try {
            // Auto-revoke sessions with very high risk scores
            if (analysis.overallRiskScore > 80) {
                const result = await TokenService.revokeAllUserSessions(userId);
                actions.push({
                    type: 'session_revocation',
                    result: result,
                    reason: 'Critical risk score threshold exceeded'
                });
                
                // Log security event
                console.error('SECURITY ALERT: Auto-revoking all sessions for user', {
                    userId,
                    riskScore: analysis.overallRiskScore,
                    threats: analysis.threats.map(t => t.type),
                    timestamp: new Date().toISOString()
                });
            }
            
            // Mark user for additional verification
            if (analysis.overallRiskScore > 60) {
                const { User } = getModels();
                await User.findByIdAndUpdate(userId, {
                    'settings.security.requiresVerification': true,
                    'settings.security.verificationReason': 'Suspicious activity detected',
                    'settings.security.verificationRequiredAt': new Date()
                });
                
                actions.push({
                    type: 'verification_required',
                    reason: 'High risk activity pattern'
                });
            }
            
            return actions;
            
        } catch (error) {
            console.error('Failed to execute security actions:', error);
            return [];
        }
    }
    
    // Utility methods
    static getMostFrequent(arr) {
        const frequency = {};
        arr.forEach(item => {
            frequency[item] = (frequency[item] || 0) + 1;
        });
        
        return Object.keys(frequency).reduce((a, b) => 
            frequency[a] > frequency[b] ? a : b
        );
    }
    
    static getFrequencyMap(arr) {
        const frequency = {};
        arr.forEach(item => {
            frequency[item] = (frequency[item] || 0) + 1;
        });
        return frequency;
    }
    
    static getHourDistribution(hours) {
        const distribution = new Array(24).fill(0);
        hours.forEach(hour => {
            distribution[hour]++;
        });
        return distribution;
    }
}

module.exports = SecurityService;