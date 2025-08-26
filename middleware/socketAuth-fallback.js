// Fallback socket authentication middleware
const jwt = require('jsonwebtoken');

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'vigichat-secret-key-change-in-production');
    } catch (error) {
        throw new Error('Invalid token');
    }
};

const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            console.log('🔒 Socket connection without token, connection denied');
            return next(new Error('Authentication required'));
        }

        const decoded = verifyToken(token);
        
        socket.userId = decoded.userId;
        socket.user = decoded.user || { id: decoded.userId };

        next();
    } catch (error) {
        console.error('Socket authentication error:', error.message);
        return next(new Error('Invalid authentication token'));
    }
};

module.exports = {
    authenticateSocket,
    verifyToken
};