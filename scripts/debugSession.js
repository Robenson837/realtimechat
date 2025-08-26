const mongoose = require('mongoose');
require('dotenv').config();

async function debugSession() {
    try {
        console.log('🔍 Debugging session system...');
        
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
        
        // Find our test user
        const testUser = await User.findOne({ email: 'newtest@test.com' });
        if (!testUser) {
            console.log('❌ Test user not found');
            return;
        }
        
        console.log('✅ Test user found:', testUser.email);
        
        // Find sessions for this user
        const sessions = await Session.find({ userId: testUser._id }).sort({ createdAt: -1 });
        console.log(`📊 Found ${sessions.length} sessions for user`);
        
        if (sessions.length > 0) {
            const latestSession = sessions[0];
            console.log('🔍 Latest session details:');
            console.log('- ID:', latestSession._id);
            console.log('- Status:', latestSession.status);
            console.log('- Created:', latestSession.createdAt);
            console.log('- Expires:', latestSession.expiresAt);
            console.log('- Risk Score:', latestSession.security.riskScore);
            console.log('- Device Type:', latestSession.deviceInfo.deviceType);
            
            // Test TokenService directly
            const TokenService = require('../services/tokenService');
            
            // Test decryption
            console.log('\n🔐 Testing token decryption...');
            try {
                const decryptedSessionToken = TokenService.decryptToken(latestSession.sessionToken);
                console.log('✅ Session token decrypted successfully');
                console.log('Token preview:', decryptedSessionToken.substring(0, 20) + '...');
                
                const decryptedRefreshToken = TokenService.decryptToken(latestSession.refreshToken);
                console.log('✅ Refresh token decrypted successfully');
                console.log('Refresh preview:', decryptedRefreshToken.substring(0, 20) + '...');
                
                // Test validation
                console.log('\n🧪 Testing token validation...');
                
                // Also test re-encryption to make sure it matches
                const reEncryptedToken = TokenService.encryptToken(decryptedSessionToken);
                console.log('Original encrypted token preview:', latestSession.sessionToken.substring(0, 30) + '...');
                console.log('Re-encrypted token preview:', reEncryptedToken.substring(0, 30) + '...');
                console.log('Tokens match:', latestSession.sessionToken === reEncryptedToken ? '✅ Yes' : '❌ No');
                
                const validation = await TokenService.validateSessionToken(decryptedSessionToken);
                console.log('Validation result:', validation.valid ? '✅ Valid' : '❌ Invalid');
                if (!validation.valid) {
                    console.log('Validation error:', validation.reason);
                }
                
            } catch (decryptError) {
                console.error('❌ Decryption failed:', decryptError.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

debugSession();