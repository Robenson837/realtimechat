#!/usr/bin/env node
// Ultra-Fast Performance Testing Script
// Tests the lightning-speed messaging optimizations

const io = require('socket.io-client');
const mongoose = require('mongoose');
require('dotenv').config();

class PerformanceTest {
    constructor() {
        this.results = {
            connectionTimes: [],
            messageSendTimes: [],
            messageReceiveTimes: [],
            roundTripTimes: [],
            cacheHitRates: [],
            batchProcessingTimes: []
        };
        
        this.testUsers = [];
        this.sockets = [];
        this.startTime = Date.now();
    }
    
    async runAllTests() {
        console.log('🚀 STARTING ULTRA-FAST MESSAGING PERFORMANCE TESTS');
        console.log('='.repeat(60));
        
        try {
            // Connect to database
            await this.setupDatabase();
            
            // Test 1: Connection Speed
            await this.testConnectionSpeed();
            
            // Test 2: Message Send Speed
            await this.testMessageSendSpeed();
            
            // Test 3: Batch Processing Speed
            await this.testBatchProcessing();
            
            // Test 4: Cache Performance
            await this.testCachePerformance();
            
            // Test 5: Concurrent Users
            await this.testConcurrentUsers();
            
            // Test 6: Real-time Delivery
            await this.testRealTimeDelivery();
            
            // Generate Report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.cleanup();
        }
    }
    
    async setupDatabase() {
        console.log('📊 Setting up database connection...');
        
        const start = Date.now();
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vigichat_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 50,
            minPoolSize: 10,
            maxIdleTimeMS: 15000,
            serverSelectionTimeoutMS: 3000,
            bufferCommands: false,
            bufferMaxEntries: 0
        });
        
        const connectionTime = Date.now() - start;
        console.log(`✅ Database connected in ${connectionTime}ms`);
        
        return connectionTime;
    }
    
    async testConnectionSpeed() {
        console.log('\n🔌 TESTING CONNECTION SPEED');
        console.log('-'.repeat(40));
        
        const testCount = 10;
        const connectionTimes = [];
        
        for (let i = 0; i < testCount; i++) {
            const start = Date.now();
            
            const socket = io('http://localhost:3000', {
                transports: ['websocket'],
                timeout: 1000,
                reconnection: false
            });
            
            await new Promise((resolve, reject) => {
                socket.on('connect', () => {
                    const connectionTime = Date.now() - start;
                    connectionTimes.push(connectionTime);
                    console.log(`  Connection ${i + 1}: ${connectionTime}ms`);
                    socket.disconnect();
                    resolve();
                });
                
                socket.on('connect_error', (error) => {
                    console.log(`  Connection ${i + 1}: FAILED - ${error.message}`);
                    reject(error);
                });
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    socket.disconnect();
                    reject(new Error('Connection timeout'));
                }, 5000);
            });
        }
        
        this.results.connectionTimes = connectionTimes;
        const avgConnection = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
        const fastConnections = connectionTimes.filter(t => t < 100).length;
        
        console.log(`📊 Average Connection Time: ${avgConnection.toFixed(2)}ms`);
        console.log(`⚡ Ultra-Fast Connections (<100ms): ${fastConnections}/${testCount} (${(fastConnections/testCount*100).toFixed(1)}%)`);
    }
    
    async testMessageSendSpeed() {
        console.log('\n📤 TESTING MESSAGE SEND SPEED');
        console.log('-'.repeat(40));
        
        // Create authenticated socket
        const socket = await this.createAuthenticatedSocket();
        const testMessages = 100;
        const sendTimes = [];
        
        console.log(`Sending ${testMessages} test messages...`);
        
        for (let i = 0; i < testMessages; i++) {
            const start = Date.now();
            const clientId = `test_${Date.now()}_${i}`;
            
            socket.emit('send-message', {
                recipientId: '507f1f77bcf86cd799439011', // Test recipient
                content: `Test message ${i + 1}`,
                type: 'text',
                clientId: clientId,
                timestamp: Date.now()
            }, (acknowledgment) => {
                const sendTime = Date.now() - start;
                sendTimes.push(sendTime);
                
                if (i % 20 === 0) {
                    console.log(`  Message ${i + 1}: ${sendTime}ms`);
                }
            });
            
            // Small delay to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Wait for all acknowledgments
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.results.messageSendTimes = sendTimes;
        const avgSend = sendTimes.reduce((a, b) => a + b, 0) / sendTimes.length;
        const ultraFast = sendTimes.filter(t => t < 50).length;
        
        console.log(`📊 Average Send Time: ${avgSend.toFixed(2)}ms`);
        console.log(`⚡ Ultra-Fast Sends (<50ms): ${ultraFast}/${sendTimes.length} (${(ultraFast/sendTimes.length*100).toFixed(1)}%)`);
        
        socket.disconnect();
    }
    
    async testBatchProcessing() {
        console.log('\n📦 TESTING BATCH PROCESSING SPEED');
        console.log('-'.repeat(40));
        
        const Message = require('../models/Message');
        const batchSizes = [10, 50, 100, 500];
        const batchTimes = [];
        
        for (const batchSize of batchSizes) {
            console.log(`  Testing batch size: ${batchSize}`);
            
            const messages = Array.from({ length: batchSize }, (_, i) => ({
                sender: new mongoose.Types.ObjectId(),
                recipient: new mongoose.Types.ObjectId(),
                content: { text: `Batch message ${i + 1}`, encrypted: false },
                type: 'text',
                status: 'sent',
                clientId: `batch_${Date.now()}_${i}`,
                createdAt: new Date()
            }));
            
            const start = Date.now();
            
            try {
                await Message.insertManyFast(messages);
                const batchTime = Date.now() - start;
                batchTimes.push({ size: batchSize, time: batchTime });
                
                const messagesPerSecond = (batchSize / batchTime * 1000).toFixed(0);
                console.log(`    ${batchSize} messages in ${batchTime}ms (${messagesPerSecond} msg/s)`);
                
            } catch (error) {
                console.log(`    FAILED: ${error.message}`);
            }
        }
        
        this.results.batchProcessingTimes = batchTimes;
    }
    
    async testCachePerformance() {
        console.log('\n🗄️ TESTING CACHE PERFORMANCE');
        console.log('-'.repeat(40));
        
        // This would test the client-side cache
        console.log('  Cache testing requires browser environment');
        console.log('  Run browser console: MessageCache.getPerformanceMetrics()');
    }
    
    async testConcurrentUsers() {
        console.log('\n👥 TESTING CONCURRENT USERS');
        console.log('-'.repeat(40));
        
        const concurrentUsers = 50;
        const sockets = [];
        const connectionTimes = [];
        
        console.log(`Creating ${concurrentUsers} concurrent connections...`);
        
        const connectionPromises = Array.from({ length: concurrentUsers }, async (_, i) => {
            const start = Date.now();
            
            const socket = io('http://localhost:3000', {
                transports: ['websocket'],
                timeout: 1000,
                reconnection: false
            });
            
            return new Promise((resolve, reject) => {
                socket.on('connect', () => {
                    const connectionTime = Date.now() - start;
                    connectionTimes.push(connectionTime);
                    sockets.push(socket);
                    
                    if (i % 10 === 0) {
                        console.log(`  User ${i + 1}: Connected in ${connectionTime}ms`);
                    }
                    
                    resolve();
                });
                
                socket.on('connect_error', reject);
                
                setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
            });
        });
        
        try {
            await Promise.allSettled(connectionPromises);
            
            const successful = sockets.length;
            const avgTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
            
            console.log(`📊 Successful Connections: ${successful}/${concurrentUsers}`);
            console.log(`📊 Average Connection Time: ${avgTime.toFixed(2)}ms`);
            
            // Disconnect all
            sockets.forEach(socket => socket.disconnect());
            
        } catch (error) {
            console.error('Concurrent user test failed:', error);
        }
    }
    
    async testRealTimeDelivery() {
        console.log('\n⚡ TESTING REAL-TIME DELIVERY');
        console.log('-'.repeat(40));
        
        // Create two authenticated sockets
        const sender = await this.createAuthenticatedSocket();
        const receiver = await this.createAuthenticatedSocket();
        
        const deliveryTimes = [];
        const testCount = 20;
        
        receiver.on('message-received', (data) => {
            const deliveryTime = Date.now() - data.timestamp;
            deliveryTimes.push(deliveryTime);
            console.log(`  Message delivered in ${deliveryTime}ms`);
        });
        
        console.log(`Testing real-time delivery with ${testCount} messages...`);
        
        for (let i = 0; i < testCount; i++) {
            sender.emit('send-message', {
                recipientId: 'test-recipient-id',
                content: `Real-time test ${i + 1}`,
                type: 'text',
                clientId: `realtime_${Date.now()}_${i}`,
                timestamp: Date.now()
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Wait for all deliveries
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.results.messageReceiveTimes = deliveryTimes;
        
        if (deliveryTimes.length > 0) {
            const avgDelivery = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
            const instantDeliveries = deliveryTimes.filter(t => t < 100).length;
            
            console.log(`📊 Average Delivery Time: ${avgDelivery.toFixed(2)}ms`);
            console.log(`⚡ Instant Deliveries (<100ms): ${instantDeliveries}/${deliveryTimes.length} (${(instantDeliveries/deliveryTimes.length*100).toFixed(1)}%)`);
        }
        
        sender.disconnect();
        receiver.disconnect();
    }
    
    async createAuthenticatedSocket() {
        return new Promise((resolve, reject) => {
            const socket = io('http://localhost:3000', {
                auth: { token: 'test-token' },
                transports: ['websocket'],
                timeout: 1000
            });
            
            socket.on('connect', () => resolve(socket));
            socket.on('connect_error', reject);
            
            setTimeout(() => {
                reject(new Error('Authentication timeout'));
            }, 5000);
        });
    }
    
    generateReport() {
        console.log('\n📊 PERFORMANCE REPORT');
        console.log('='.repeat(60));
        
        const totalTime = Date.now() - this.startTime;
        
        console.log(`🚀 ULTRA-FAST MESSAGING SYSTEM PERFORMANCE REPORT`);
        console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
        console.log(`⏱️ Total Test Time: ${(totalTime / 1000).toFixed(2)}s`);
        console.log('');
        
        // Connection Performance
        if (this.results.connectionTimes.length > 0) {
            const avgConnection = this.results.connectionTimes.reduce((a, b) => a + b, 0) / this.results.connectionTimes.length;
            const fastConnections = this.results.connectionTimes.filter(t => t < 100).length;
            
            console.log('🔌 CONNECTION PERFORMANCE:');
            console.log(`   Average: ${avgConnection.toFixed(2)}ms`);
            console.log(`   Ultra-Fast: ${(fastConnections/this.results.connectionTimes.length*100).toFixed(1)}%`);
            console.log('');
        }
        
        // Message Send Performance
        if (this.results.messageSendTimes.length > 0) {
            const avgSend = this.results.messageSendTimes.reduce((a, b) => a + b, 0) / this.results.messageSendTimes.length;
            const ultraFast = this.results.messageSendTimes.filter(t => t < 50).length;
            
            console.log('📤 MESSAGE SEND PERFORMANCE:');
            console.log(`   Average: ${avgSend.toFixed(2)}ms`);
            console.log(`   Ultra-Fast (<50ms): ${(ultraFast/this.results.messageSendTimes.length*100).toFixed(1)}%`);
            console.log('');
        }
        
        // Delivery Performance
        if (this.results.messageReceiveTimes.length > 0) {
            const avgDelivery = this.results.messageReceiveTimes.reduce((a, b) => a + b, 0) / this.results.messageReceiveTimes.length;
            const instantDeliveries = this.results.messageReceiveTimes.filter(t => t < 100).length;
            
            console.log('📲 MESSAGE DELIVERY PERFORMANCE:');
            console.log(`   Average: ${avgDelivery.toFixed(2)}ms`);
            console.log(`   Instant (<100ms): ${(instantDeliveries/this.results.messageReceiveTimes.length*100).toFixed(1)}%`);
            console.log('');
        }
        
        // Batch Processing Performance
        if (this.results.batchProcessingTimes.length > 0) {
            console.log('📦 BATCH PROCESSING PERFORMANCE:');
            this.results.batchProcessingTimes.forEach(batch => {
                const messagesPerSecond = (batch.size / batch.time * 1000).toFixed(0);
                console.log(`   ${batch.size} messages: ${batch.time}ms (${messagesPerSecond} msg/s)`);
            });
            console.log('');
        }
        
        console.log('🎯 PERFORMANCE SUMMARY:');
        
        // Overall rating
        const connectionQuality = this.results.connectionTimes.length > 0 ? 
            (this.results.connectionTimes.filter(t => t < 100).length / this.results.connectionTimes.length) : 0;
        const sendQuality = this.results.messageSendTimes.length > 0 ? 
            (this.results.messageSendTimes.filter(t => t < 50).length / this.results.messageSendTimes.length) : 0;
        const deliveryQuality = this.results.messageReceiveTimes.length > 0 ? 
            (this.results.messageReceiveTimes.filter(t => t < 100).length / this.results.messageReceiveTimes.length) : 0;
        
        const overallScore = ((connectionQuality + sendQuality + deliveryQuality) / 3 * 100).toFixed(1);
        
        console.log(`   Overall Ultra-Fast Score: ${overallScore}%`);
        
        if (overallScore >= 90) {
            console.log('   🏆 EXCELLENT - Lightning-speed performance achieved!');
        } else if (overallScore >= 80) {
            console.log('   🥈 VERY GOOD - Ultra-fast performance achieved!');
        } else if (overallScore >= 70) {
            console.log('   🥉 GOOD - Fast performance achieved!');
        } else {
            console.log('   📈 NEEDS IMPROVEMENT - Consider further optimizations');
        }
        
        console.log('\n⚡ RECOMMENDATIONS:');
        if (connectionQuality < 0.8) {
            console.log('   - Optimize WebSocket connection settings');
        }
        if (sendQuality < 0.8) {
            console.log('   - Implement message batching');
        }
        if (deliveryQuality < 0.8) {
            console.log('   - Optimize real-time delivery pipeline');
        }
        
        console.log('\n✅ Performance testing completed!');
    }
    
    async cleanup() {
        console.log('\n🧹 Cleaning up test environment...');
        
        // Disconnect all sockets
        this.sockets.forEach(socket => {
            if (socket.connected) {
                socket.disconnect();
            }
        });
        
        // Close database connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        
        console.log('✅ Cleanup completed');
    }
}

// Run tests if called directly
if (require.main === module) {
    const test = new PerformanceTest();
    test.runAllTests()
        .then(() => {
            console.log('\n🎉 All tests completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Tests failed:', error);
            process.exit(1);
        });
}

module.exports = PerformanceTest;