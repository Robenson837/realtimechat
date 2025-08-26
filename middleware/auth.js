const jwt = require('jsonwebtoken');
const { getModels } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'vigichat-secret-key-change-in-production';

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        // Reduced logging to prevent console spam
        // console.log('Auth middleware - Token received:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
        
        if (!token) {
            console.log('Auth middleware - No token provided');
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // console.log('Auth middleware - Token decoded successfully:', decoded);
            
            const { User } = getModels();
            const user = await User.findById(decoded.userId).select('-password');
            
            // console.log('Auth middleware - User found:', user ? user.username : 'NO USER');
        
            if (!user || !user.isActive) {
                console.log('Auth middleware - User not found or inactive');
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid token or user not found.' 
                });
            }

            req.user = user;
            // console.log('Auth middleware - Success, user authenticated:', user.username);
            next();
            
        } catch (jwtError) {
            console.error('Auth middleware - JWT verification failed:', jwtError.message);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token signature.' 
            });
        }
    } catch (error) {
        console.error('Auth middleware - General error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Authentication error.' 
        });
    }
};

const generateToken = (userId) => {
    // console.log('Generating token for user:', userId);
    // console.log('Using JWT_SECRET:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NO SECRET');
    
    const token = jwt.sign({ userId }, JWT_SECRET, { 
        expiresIn: process.env.JWT_EXPIRE || '30d' // Extended to 30 days for better user experience
    });
    
    // console.log('Generated token:', token ? `${token.substring(0, 20)}...` : 'FAILED');
    return token;
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = { auth, generateToken, verifyToken };