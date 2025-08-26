const mongoose = require('mongoose');

let User, Message, Conversation, Session;

/**
 * Initialize all models after MongoDB connection is established
 * This prevents the "mongoose.model" undefined error
 */
function initializeModels() {
    if (!mongoose.connection.readyState) {
        throw new Error('MongoDB connection not established. Call this after mongoose.connect()');
    }

    // Only initialize once
    if (User && Message && Conversation && Session) {
        return { User, Message, Conversation, Session };
    }

    // Import and create models
    User = require('./User');
    Message = require('./Message');
    Conversation = require('./Conversation');
    Session = require('./Session');

    return { User, Message, Conversation, Session };
}

/**
 * Get models (they must be initialized first)
 */
function getModels() {
    if (!User || !Message || !Conversation || !Session) {
        throw new Error('Models not initialized. Call initializeModels() first.');
    }
    return { User, Message, Conversation, Session };
}

module.exports = {
    initializeModels,
    getModels
};