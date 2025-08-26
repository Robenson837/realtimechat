const { getModels } = require('../models');
const TokenService = require('../services/tokenService');
const SecurityService = require('../services/securityService');

/**
 * Cleanup expired sessions and perform security maintenance
 */
async function performSecurityCleanup() {
    try {
        console.log('Starting security cleanup...');
        
        // Clean up expired sessions
        await TokenService.cleanupExpiredSessions();
        
        // Clean up old session records (older than 30 days)
        const { Session } = getModels();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const deletedResult = await Session.deleteMany({
            $or: [
                { status: 'expired', expiresAt: { $lt: thirtyDaysAgo } },
                { status: 'revoked', 'metadata.revokedAt': { $lt: thirtyDaysAgo } }
            ]
        });
        
        console.log(`Deleted ${deletedResult.deletedCount} old session records`);
        
        // Update suspicious session statuses
        const suspiciousResult = await Session.updateMany(
            { 
                'security.isSuspicious': true,
                'security.riskScore': { $gt: 80 },
                status: 'active'
            },
            { 
                status: 'suspicious',
                'metadata.autoMarkedSuspicious': true,
                'metadata.autoMarkedAt': new Date()
            }
        );
        
        console.log(`Marked ${suspiciousResult.modifiedCount} sessions as suspicious`);
        
        // Analyze users with high-risk patterns
        await performSecurityAnalysis();
        
        console.log('Security cleanup completed successfully');
        
    } catch (error) {
        console.error('Security cleanup failed:', error);
        throw error;
    }
}

/**
 * Perform security analysis on active users
 */
async function performSecurityAnalysis() {
    try {
        console.log('Performing security analysis...');
        
        const { Session, User } = getModels();
        
        // Get users with recent activity (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsers = await Session.distinct('userId', {
            lastActivity: { $gte: oneDayAgo },
            status: 'active'
        });
        
        console.log(`Analyzing ${activeUsers.length} active users...`);
        
        let highRiskUsers = 0;
        let actionsExecuted = 0;
        
        for (const userId of activeUsers) {
            try {
                const analysis = await SecurityService.analyzeUserSecurity(userId);
                
                if (analysis.overallRiskScore > 60) {
                    highRiskUsers++;
                    
                    console.warn(`High-risk user detected:`, {
                        userId: userId.toString(),
                        riskScore: analysis.overallRiskScore,
                        threats: analysis.threats.map(t => t.type),
                        recommendations: analysis.recommendations.length
                    });
                    
                    // Execute automatic security actions if necessary
                    if (analysis.overallRiskScore > 80) {
                        const actions = await SecurityService.executeSecurityActions(userId, analysis);
                        actionsExecuted += actions.length;
                        
                        if (actions.length > 0) {
                            console.log(`Executed ${actions.length} security actions for user ${userId}`);
                        }
                    }
                }
                
            } catch (userError) {
                console.error(`Failed to analyze user ${userId}:`, userError.message);
            }
        }
        
        console.log(`Security analysis complete: ${highRiskUsers} high-risk users, ${actionsExecuted} actions executed`);
        
    } catch (error) {
        console.error('Security analysis failed:', error);
    }
}

/**
 * Generate security report
 */
async function generateSecurityReport() {
    try {
        console.log('Generating security report...');
        
        const { Session, User } = getModels();
        
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Basic statistics
        const stats = {
            totalActiveSessions: await Session.countDocuments({ status: 'active' }),
            totalUsers: await User.countDocuments({ isActive: true }),
            dailyLogins: await Session.countDocuments({ 
                createdAt: { $gte: oneDayAgo },
                status: { $in: ['active', 'expired', 'revoked'] }
            }),
            weeklyLogins: await Session.countDocuments({ 
                createdAt: { $gte: oneWeekAgo },
                status: { $in: ['active', 'expired', 'revoked'] }
            }),
            suspiciousSessions: await Session.countDocuments({ 'security.isSuspicious': true }),
            highRiskSessions: await Session.countDocuments({ 'security.riskScore': { $gte: 70 } }),
            newDeviceLogins: await Session.countDocuments({ 
                'security.isNewDevice': true,
                createdAt: { $gte: oneDayAgo }
            })
        };
        
        // Top countries by login volume
        const topCountries = await Session.aggregate([
            { $match: { createdAt: { $gte: oneWeekAgo } } },
            { $group: { _id: '$location.country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        // Top browsers
        const topBrowsers = await Session.aggregate([
            { $match: { createdAt: { $gte: oneWeekAgo } } },
            { $group: { _id: '$deviceInfo.browser.name', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        
        // Risk distribution
        const riskDistribution = await Session.aggregate([
            { $match: { status: 'active' } },
            {
                $bucket: {
                    groupBy: '$security.riskScore',
                    boundaries: [0, 20, 40, 60, 80, 100],
                    default: 'Unknown',
                    output: { count: { $sum: 1 } }
                }
            }
        ]);
        
        const report = {
            timestamp: now.toISOString(),
            statistics: stats,
            topCountries,
            topBrowsers,
            riskDistribution,
            alerts: {
                highRiskSessions: stats.highRiskSessions,
                suspiciousActivity: stats.suspiciousSessions > stats.totalActiveSessions * 0.1,
                unusualGeoActivity: topCountries.length > 20
            }
        };
        
        console.log('Security Report Generated:', {
            activeSessions: stats.totalActiveSessions,
            dailyLogins: stats.dailyLogins,
            suspiciousSessions: stats.suspiciousSessions,
            highRiskSessions: stats.highRiskSessions
        });
        
        return report;
        
    } catch (error) {
        console.error('Failed to generate security report:', error);
        throw error;
    }
}

/**
 * Monitor real-time security events
 */
function startSecurityMonitoring() {
    console.log('Starting real-time security monitoring...');
    
    // Monitor for high-risk sessions every 5 minutes
    setInterval(async () => {
        try {
            const { Session } = getModels();
            
            const highRiskSessions = await Session.find({
                'security.riskScore': { $gte: 80 },
                status: 'active',
                'security.isSuspicious': false // Not yet marked
            }).populate('userId', 'email username');
            
            for (const session of highRiskSessions) {
                console.warn('Real-time high-risk session detected:', {
                    sessionId: session._id,
                    userId: session.userId._id,
                    email: session.userId.email,
                    riskScore: session.security.riskScore,
                    ip: session.location.ip,
                    country: session.location.country
                });
                
                // Mark as suspicious
                await session.markSuspicious('High risk score detected by monitoring');
            }
            
        } catch (error) {
            console.error('Security monitoring error:', error);
        }
    }, 5 * 60 * 1000); // Every 5 minutes
}

module.exports = {
    performSecurityCleanup,
    performSecurityAnalysis,
    generateSecurityReport,
    startSecurityMonitoring
};