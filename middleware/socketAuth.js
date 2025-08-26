const { verifyToken } = require('./auth');
const { getModels } = require('../models');

const authenticateSocket = async (socket, next) => {
    try {
        console.log('Socket authentication attempt');
        
        // Sanitize sensitive token data for logging
        const sanitizedAuth = { ...socket.handshake.auth };
        if (sanitizedAuth.token) {
            sanitizedAuth.token = `${sanitizedAuth.token.substring(0, 10)}...${sanitizedAuth.token.slice(-4)}`;
        }
        console.log('Auth object:', sanitizedAuth);
        
        const sanitizedHeader = socket.handshake.headers.authorization 
            ? `Bearer ${socket.handshake.headers.authorization.replace('Bearer ', '').substring(0, 10)}...${socket.handshake.headers.authorization.replace('Bearer ', '').slice(-4)}`
            : socket.handshake.headers.authorization;
        console.log('Headers:', sanitizedHeader);
        
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            console.log('No token found in socket handshake');
            return next(new Error('Authentication error: No token provided'));
        }
        
        console.log('Token found, verifying...');

        const decoded = verifyToken(token);
        const { User } = getModels();
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.isActive) {
            return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        
        next();
    } catch (error) {
        next(new Error('Authentication error: Invalid token'));
    }
};

module.exports = { authenticateSocket };