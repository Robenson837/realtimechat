const mongoose = require('mongoose');
require('dotenv').config();

// Import models after connection
async function migrateToSessionAuth() {
    try {
        console.log('🔄 Starting migration to session authentication...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vigichat_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Initialize models
        const { initializeModels, getModels } = require('../models');
        initializeModels();
        const { User, Session } = getModels();
        
        // Ensure Session collection exists (the indexes are created automatically by Mongoose)
        await Session.init();
        console.log('✅ Session collection initialized');
        
        // Update User schema to add security settings if not present
        const usersToUpdate = await User.find({
            'settings.security': { $exists: false }
        });
        
        if (usersToUpdate.length > 0) {
            console.log(`📝 Updating ${usersToUpdate.length} users with security settings...`);
            
            for (const user of usersToUpdate) {
                if (!user.settings) {
                    user.settings = {
                        notifications: {
                            sound: true,
                            desktop: true,
                            email: false
                        },
                        privacy: {
                            lastSeen: 'everyone',
                            profilePhoto: 'everyone',
                            status: 'everyone',
                            email: 'contacts'
                        },
                        theme: 'light'
                    };
                }
                
                user.settings.security = {
                    requiresVerification: false,
                    twoFactorEnabled: false,
                    loginNotifications: true,
                    securityLevel: 'standard'
                };
                
                await user.save();
            }
            
            console.log('✅ User security settings updated');
        }
        
        // Clean up any existing invalid sessions
        const invalidSessions = await Session.deleteMany({
            $or: [
                { sessionToken: { $exists: false } },
                { refreshToken: { $exists: false } },
                { userId: { $exists: false } }
            ]
        });
        
        if (invalidSessions.deletedCount > 0) {
            console.log(`🗑️ Cleaned up ${invalidSessions.deletedCount} invalid sessions`);
        }
        
        // Test session creation
        console.log('🧪 Testing session creation...');
        
        const testUser = await User.findOne({ email: 'test@test.com' });
        if (testUser) {
            const TokenService = require('../services/tokenService');
            const DeviceService = require('../services/deviceService');
            
            // Simulate device info
            const mockDeviceInfo = {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                ip: '127.0.0.1',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br'
            };
            
            const mockLocationInfo = {
                ip: '127.0.0.1',
                country: 'Test Country',
                region: 'Test Region',
                city: 'Test City',
                timezone: 'UTC'
            };
            
            const sessionResult = await TokenService.createSession(
                testUser._id,
                mockDeviceInfo,
                mockLocationInfo,
                { loginMethod: 'password' }
            );
            
            console.log('✅ Test session created successfully:', {
                sessionId: sessionResult.session._id,
                isNewDevice: sessionResult.isNewDevice,
                riskScore: sessionResult.session.security.riskScore
            });
            
            // Test session validation
            const validation = await TokenService.validateSessionToken(sessionResult.sessionToken);
            
            if (validation.valid) {
                console.log('✅ Session validation test passed');
                
                // Clean up test session
                await TokenService.revokeSession(sessionResult.sessionToken, 'Migration test cleanup');
                console.log('🧹 Test session cleaned up');
            } else {
                console.error('❌ Session validation test failed:', validation.reason);
                // Still try to clean up
                await TokenService.revokeSession(sessionResult.sessionToken, 'Migration test cleanup');
                console.log('🧹 Test session cleaned up (after validation failure)');
            }
        }
        
        // Generate initial security report
        const { generateSecurityReport } = require('../utils/securityCleanup');
        const report = await generateSecurityReport();
        
        console.log('📊 Initial security report:', {
            totalActiveSessions: report.statistics.totalActiveSessions,
            totalUsers: report.statistics.totalUsers,
            suspiciousSessions: report.statistics.suspiciousSessions
        });
        
        console.log('🎉 Migration completed successfully!');
        
        console.log('\n📋 Next Steps:');
        console.log('1. Update your frontend to use the new session endpoints:');
        console.log('   - Login: POST /api/session-auth/login');
        console.log('   - Refresh: POST /api/session-auth/refresh');
        console.log('   - Logout: POST /api/session-auth/logout');
        console.log('   - Sessions: GET /api/session-auth/sessions');
        console.log('');
        console.log('2. Update middleware usage in your routes:');
        console.log('   - Replace "auth" with "sessionAuth" from middleware/sessionAuth.js');
        console.log('');
        console.log('3. Configure environment variables:');
        console.log('   - ENCRYPTION_KEY (32 characters minimum)');
        console.log('   - JWT_SECRET (strong secret key)');
        console.log('');
        console.log('4. The system will automatically:');
        console.log('   - Clean up expired sessions every 6 hours');
        console.log('   - Monitor for suspicious activity in real-time');
        console.log('   - Generate security reports');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateToSessionAuth()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = migrateToSessionAuth;