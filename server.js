require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const path = require('path');
const session = require('express-session');
const passport = require('passport');

// Try MongoDB routes first, fallback if needed
let authRoutes, userRoutes, messageRoutes, contactRoutes, uploadRoutes, sessionAuthRoutes;
const { initializeModels } = require('./models');

const loadRoutes = () => {
    console.log('Loading MongoDB routes...');
    try {
        // Initialize models first, then load routes
        console.log('Initializing models...');
        initializeModels();
        console.log('Models initialized successfully');
        
        console.log('Loading auth routes...');
        authRoutes = require('./routes/auth');
        console.log('Loading session auth routes...');
        sessionAuthRoutes = require('./routes/sessionAuth');
        console.log('Loading user routes...');
        userRoutes = require('./routes/users');
        console.log('Loading message routes...');
        messageRoutes = require('./routes/messages');
        console.log('Loading contact routes...');
        contactRoutes = require('./routes/contacts');
        console.log('Loading upload routes...');
        uploadRoutes = require('./routes/upload');
        console.log('All routes loaded successfully');
    } catch (error) {
        console.error('Error loading routes:', error);
        throw error;
    }
};

const { authenticateSocket } = require('./middleware/socketAuth');
const { initializeSocketHandlers, activeUsers } = require('./socket/socketHandlers');
const { cleanupOldMessages } = require('./utils/cleanup');
const { performSecurityCleanup, startSecurityMonitoring } = require('./utils/securityCleanup');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    },
    // SIMPLE, STABLE CONFIGURATION
    pingTimeout: 60000,    // 60 seconds - very stable timeout
    pingInterval: 25000,   // 25 seconds - reasonable monitoring
    transports: ['polling', 'websocket'], // Allow both transports
    allowEIO3: true,      // Allow older engine.io for compatibility
    connectTimeout: 45000, // 45 seconds - generous timeout
    upgradeTimeout: 10000, // 10 seconds - stable upgrade timeout
    allowUpgrades: true,
    compression: true,    // Enable compression for stability
    cookie: true,         // Enable cookies
    serveClient: true,    // Serve client files
});

console.log('Attempting MongoDB connection...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Configured from .env' : 'Using default local');

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
});

// Initialize MongoDB and routes before starting server
const initializeApp = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vigichat_db', {
            // ULTRA-FAST DATABASE OPTIMIZATIONS
            serverSelectionTimeoutMS: 3000,   // 3 seconds - faster server selection
            connectTimeoutMS: 5000,           // 5 seconds - faster connection timeout
            socketTimeoutMS: 10000,           // 10 seconds - faster socket timeout
            maxPoolSize: 50,                  // More connections for high throughput
            minPoolSize: 10,                  // Keep more connections ready
            maxIdleTimeMS: 15000,             // Faster idle cleanup (15 seconds)
            heartbeatFrequencyMS: 5000,       // More frequent heartbeats (5 seconds)
            // PERFORMANCE OPTIMIZATIONS
            bufferCommands: false,            // Disable command buffering
            // READ/WRITE OPTIMIZATIONS
            readPreference: 'primary',        // Fastest read from primary
            readConcern: { level: 'local' },  // Faster read concern
            writeConcern: { 
                w: 1,                         // Faster write acknowledgment
                j: false,                     // Skip journal for speed (trade safety for speed)
                wtimeout: 5000               // 5 second write timeout
            }
        });
        
        console.log('Connected to MongoDB Atlas successfully!');
        loadRoutes();
        setupRoutes();
        
        // Start server after everything is ready
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('WebSocket server ready');
        });
        
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        console.error('Application cannot start without database connection');
        process.exit(1);
    }
};

// Initialize the application
initializeApp();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

// Middleware
// CSP configured to allow FontAwesome and fonts
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "http://localhost:3000", "https://nominatim.openstreetmap.org", "https://maps.googleapis.com", "https://www.google.com"],
            frameSrc: ["'self'", "https://docs.google.com", "https://drive.google.com", "https://view.officeapps.live.com", "https://www.openstreetmap.org"] // Allow Google Docs, Office Online Viewer and OpenStreetMap for location preview
        }
    }
}));

app.use(compression());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true // Enable cookies
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (more generous for development)
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Configure session for Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup routes (loaded after MongoDB connection)
const setupRoutes = () => {
    console.log('Setting up API routes...');
    try {
        console.log('Mounting /api/auth routes...');
        app.use('/api/auth', authRoutes);
        console.log('Mounting /api/session-auth routes...');
        app.use('/api/session-auth', sessionAuthRoutes);
        console.log('Mounting /api/users routes...');
        app.use('/api/users', userRoutes);
        console.log('Mounting /api/messages routes...');
        app.use('/api/messages', messageRoutes);
        console.log('Mounting /api/contacts routes...');
        app.use('/api/contacts', contactRoutes);
        console.log('Mounting /api/upload routes...');
        app.use('/api/upload', uploadRoutes);
        console.log('API Routes mounted successfully');
        
        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ 
                success: false, 
                message: process.env.NODE_ENV === 'production' 
                    ? 'Something went wrong!' 
                    : err.message 
            });
        });

        // 404 handler - MUST be last
        app.use('*', (req, res) => {
            console.log('404 handler caught request for:', req.originalUrl);
            res.status(404).json({ 
                success: false, 
                message: 'Route not found' 
            });
        });
        
        // List all routes for debugging
        console.log('Registered routes:');
        app._router.stack.forEach(function(r){
            if (r.route && r.route.path){
                console.log('  -', r.route.path);
            } else if (r.name === 'router') {
                console.log('  - Router:', r.regexp);
            }
        });
    } catch (error) {
        console.error('Error setting up routes:', error);
        throw error;
    }
};

// Serve main app using root index.html with real-time functionality
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Also serve the authenticated app for direct access
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO authentication middleware
io.use(authenticateSocket);

// Make socket instances and activeUsers available globally
app.set('io', io);
app.set('activeUsers', activeUsers);

// Initialize socket handlers
initializeSocketHandlers(io);

// Cleanup old messages daily at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Running daily cleanup...');
    cleanupOldMessages();
});

// Security cleanup every 6 hours
cron.schedule('0 */6 * * *', () => {
    console.log('Running security cleanup...');
    performSecurityCleanup().catch(error => {
        console.error('Security cleanup failed:', error);
    });
});

// Start real-time security monitoring
if (process.env.NODE_ENV !== 'test') {
    startSecurityMonitoring();
}

module.exports = { app, server, io };