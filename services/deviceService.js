const axios = require('axios');
const crypto = require('crypto');

class DeviceService {
    /**
     * Extract device information from request
     */
    static extractDeviceInfo(req) {
        const userAgent = req.get('User-Agent') || '';
        const ip = this.extractIP(req);
        
        // Extract additional client info from headers
        const acceptLanguage = req.get('Accept-Language') || '';
        const acceptEncoding = req.get('Accept-Encoding') || '';
        const referer = req.get('Referer') || '';
        
        // Generate device fingerprint
        const fingerprint = this.generateDeviceFingerprint({
            userAgent,
            ip,
            acceptLanguage,
            acceptEncoding,
            referer
        });
        
        return {
            userAgent,
            ip,
            acceptLanguage,
            acceptEncoding,
            referer,
            fingerprint
        };
    }

    /**
     * Extract real IP address from request
     */
    static extractIP(req) {
        return req.ip ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.headers['x-client-ip'] ||
               '127.0.0.1';
    }

    /**
     * Generate enhanced device fingerprint for robust device/browser detection
     */
    static generateDeviceFingerprint(deviceData) {
        // Parse user agent for more granular info
        const parsedUA = this.parseUserAgent(deviceData.userAgent);
        
        const fingerprintData = {
            // Browser specifics
            browserName: parsedUA.browser.name,
            browserVersion: parsedUA.browser.version?.split('.')[0], // Major version only
            
            // OS specifics  
            osName: parsedUA.os.name,
            osVersion: parsedUA.os.version?.split('.')[0], // Major version only
            
            // Device type
            deviceType: parsedUA.deviceType,
            
            // Network/Language preferences (these tend to be consistent per user/location)
            language: (deviceData.acceptLanguage || '').split(',')[0], // Primary language only
            encoding: deviceData.acceptEncoding,
            
            // Exclude IP from fingerprint since it can change (wifi/mobile switching)
            // This allows same-device recognition across network changes
        };
        
        // Create a stable fingerprint that identifies the specific browser on the specific device
        const fingerprintString = JSON.stringify(fingerprintData);
        return crypto.createHash('sha256').update(fingerprintString).digest('hex');
    }

    /**
     * Generate additional security fingerprint that includes network info
     * This is used for detecting when same session is accessed from different locations
     */
    static generateSecurityFingerprint(deviceData) {
        const securityData = {
            // Include IP for security checks (but not for device identification)
            ipSubnet: this.getIPSubnet(deviceData.ip), // Use subnet instead of exact IP
            userAgent: deviceData.userAgent,
            language: deviceData.acceptLanguage,
        };
        
        const securityString = JSON.stringify(securityData);
        return crypto.createHash('sha256').update(securityString).digest('hex');
    }

    /**
     * Get IP subnet for broader network matching
     */
    static getIPSubnet(ip) {
        if (!ip || ip === '127.0.0.1') return 'local';
        
        try {
            // For IPv4, use first 3 octets as subnet
            const parts = ip.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
            }
            
            // For IPv6 or other formats, use first part
            return ip.split(':')[0] + ':x';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Parse user agent to extract browser and OS info
     */
    static parseUserAgent(userAgent) {
        const browserRegex = /(Chrome|Firefox|Safari|Edge|Opera|Internet Explorer)\/?([\d.]+)?/i;
        const osRegex = /(Windows NT|Mac OS X|Linux|Android|iOS|iPhone OS)[\s]?([\d._]+)?/i;
        const mobileRegex = /(Mobile|Tablet|iPad|iPhone|Android)/i;
        
        const browserMatch = userAgent.match(browserRegex);
        const osMatch = userAgent.match(osRegex);
        const isMobile = mobileRegex.test(userAgent);
        
        let deviceType = 'desktop';
        if (isMobile) {
            if (/Tablet|iPad/i.test(userAgent)) {
                deviceType = 'tablet';
            } else if (/Mobile|iPhone|Android/i.test(userAgent)) {
                deviceType = 'mobile';
            }
        }
        
        return {
            browser: {
                name: browserMatch ? browserMatch[1] : 'Unknown',
                version: browserMatch ? browserMatch[2] : 'Unknown'
            },
            os: {
                name: osMatch ? osMatch[1].replace(/NT|OS X/g, '').trim() : 'Unknown',
                version: osMatch ? osMatch[2] : 'Unknown'
            },
            deviceType,
            isMobile
        };
    }

    /**
     * Get location information from IP address
     */
    static async getLocationFromIP(ip) {
        try {
            // Skip location lookup for local IPs
            if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                return {
                    ip,
                    country: 'Local',
                    region: 'Local',
                    city: 'Local',
                    timezone: 'Local',
                    coordinates: null
                };
            }

            // Use free IP geolocation service (replace with your preferred service)
            const response = await axios.get(`http://ip-api.com/json/${ip}`, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'VigiChat-Security-Service'
                }
            });

            if (response.data && response.data.status === 'success') {
                return {
                    ip,
                    country: response.data.country || 'Unknown',
                    region: response.data.regionName || 'Unknown',
                    city: response.data.city || 'Unknown',
                    timezone: response.data.timezone || 'Unknown',
                    coordinates: {
                        lat: response.data.lat || null,
                        lon: response.data.lon || null
                    }
                };
            }
        } catch (error) {
            console.warn('Failed to get location from IP:', error.message);
        }

        // Return default location info if service fails
        return {
            ip,
            country: 'Unknown',
            region: 'Unknown',
            city: 'Unknown',
            timezone: 'Unknown',
            coordinates: null
        };
    }

    /**
     * Calculate distance between two coordinates
     */
    static calculateDistance(coord1, coord2) {
        if (!coord1 || !coord2 || !coord1.lat || !coord1.lon || !coord2.lat || !coord2.lon) {
            return null;
        }

        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(coord2.lat - coord1.lat);
        const dLon = this.toRad(coord2.lon - coord1.lon);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(coord1.lat)) * Math.cos(this.toRad(coord2.lat)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    /**
     * Convert degrees to radians
     */
    static toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Check if device is suspicious based on various factors
     */
    static async detectSuspiciousDevice(deviceInfo, userSessions = []) {
        const suspiciousFactors = [];
        let riskScore = 0;

        // Check user agent patterns
        const userAgent = deviceInfo.userAgent.toLowerCase();
        const suspiciousUAPatterns = [
            'curl', 'wget', 'python', 'bot', 'crawler', 'spider',
            'headless', 'phantom', 'selenium', 'automated'
        ];

        for (const pattern of suspiciousUAPatterns) {
            if (userAgent.includes(pattern)) {
                suspiciousFactors.push(`Suspicious user agent: ${pattern}`);
                riskScore += 40;
                break;
            }
        }

        // Check for very old or very new browser versions
        const deviceData = this.parseUserAgent(deviceInfo.userAgent);
        if (deviceData.browser.name === 'Unknown') {
            suspiciousFactors.push('Unknown browser');
            riskScore += 20;
        }

        // Check for rapid requests from different devices
        if (userSessions.length > 0) {
            const recentSessions = userSessions.filter(session => {
                const sessionTime = new Date(session.createdAt);
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                return sessionTime > oneHourAgo;
            });

            const uniqueFingerprints = new Set(recentSessions.map(s => s.deviceInfo.fingerprint));
            if (uniqueFingerprints.size > 3) {
                suspiciousFactors.push('Multiple devices in short time');
                riskScore += 25;
            }
        }

        // Check time patterns (logins at unusual hours)
        const hour = new Date().getHours();
        if (hour < 5 || hour > 23) {
            suspiciousFactors.push('Login at unusual hours');
            riskScore += 10;
        }

        return {
            isSuspicious: riskScore > 30,
            riskScore: Math.min(riskScore, 100),
            factors: suspiciousFactors
        };
    }

    /**
     * Check for impossible travel between sessions
     */
    static checkImpossibleTravel(currentLocation, previousLocation, timeElapsed) {
        if (!currentLocation.coordinates || !previousLocation.coordinates) {
            return { impossible: false, reason: 'Insufficient location data' };
        }

        const distance = this.calculateDistance(
            currentLocation.coordinates,
            previousLocation.coordinates
        );

        if (distance === null) {
            return { impossible: false, reason: 'Could not calculate distance' };
        }

        // Calculate maximum possible travel speed (km/h)
        const timeElapsedHours = timeElapsed / (1000 * 60 * 60);
        const maxReasonableSpeed = 1000; // 1000 km/h (commercial aircraft speed)
        
        if (timeElapsedHours > 0) {
            const travelSpeed = distance / timeElapsedHours;
            
            if (travelSpeed > maxReasonableSpeed) {
                return {
                    impossible: true,
                    reason: `Impossible travel: ${distance.toFixed(1)}km in ${timeElapsedHours.toFixed(1)}h (${travelSpeed.toFixed(1)}km/h)`,
                    distance,
                    timeElapsed: timeElapsedHours,
                    speed: travelSpeed
                };
            }
        }

        return { impossible: false, distance, timeElapsed: timeElapsedHours };
    }

    /**
     * Analyze session security patterns
     */
    static analyzeSessionSecurity(currentSession, userSessions) {
        const analysis = {
            isNewDevice: true,
            isNewLocation: true,
            suspiciousPatterns: [],
            riskScore: 0
        };

        if (userSessions.length === 0) {
            analysis.riskScore = 10; // New user, low risk
            return analysis;
        }

        // Check if this device has been used before
        const sameDeviceSessions = userSessions.filter(session => 
            session.deviceInfo.fingerprint === currentSession.deviceInfo.fingerprint
        );
        
        if (sameDeviceSessions.length > 0) {
            analysis.isNewDevice = false;
            analysis.riskScore -= 5; // Familiar device, lower risk
        } else {
            analysis.riskScore += 15; // New device, higher risk
        }

        // Check location patterns
        const sameCountrySessions = userSessions.filter(session =>
            session.location.country === currentSession.location.country
        );

        if (sameCountrySessions.length > 0) {
            analysis.isNewLocation = false;
            analysis.riskScore -= 5; // Familiar location, lower risk
        } else {
            analysis.riskScore += 20; // New country, higher risk
            analysis.suspiciousPatterns.push('New country detected');
        }

        // Check for rapid country changes
        const recentSessions = userSessions
            .filter(session => {
                const sessionTime = new Date(session.createdAt);
                const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
                return sessionTime > sixHoursAgo;
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (recentSessions.length > 0) {
            const latestSession = recentSessions[0];
            const timeElapsed = Date.now() - new Date(latestSession.createdAt).getTime();
            
            const travelCheck = this.checkImpossibleTravel(
                currentSession.location,
                latestSession.location,
                timeElapsed
            );

            if (travelCheck.impossible) {
                analysis.suspiciousPatterns.push(travelCheck.reason);
                analysis.riskScore += 40;
            }
        }

        // Multiple devices/locations in short time
        const oneHourSessions = userSessions.filter(session => {
            const sessionTime = new Date(session.createdAt);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            return sessionTime > oneHourAgo;
        });

        const uniqueCountries = new Set(oneHourSessions.map(s => s.location.country));
        const uniqueDevices = new Set(oneHourSessions.map(s => s.deviceInfo.fingerprint));

        if (uniqueCountries.size > 2) {
            analysis.suspiciousPatterns.push('Multiple countries in one hour');
            analysis.riskScore += 30;
        }

        if (uniqueDevices.size > 3) {
            analysis.suspiciousPatterns.push('Multiple devices in one hour');
            analysis.riskScore += 25;
        }

        analysis.riskScore = Math.min(analysis.riskScore, 100);
        return analysis;
    }
}

module.exports = DeviceService;