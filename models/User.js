const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        match: /^[a-zA-Z0-9_]+$/
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    avatar: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'away', 'busy'],
        default: 'offline'
    },
    statusMessage: {
        type: String,
        maxlength: 100,
        default: ''
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    contacts: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        blocked: {
            type: Boolean,
            default: false
        }
    }],
    contactRequests: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        sentAt: {
            type: Date,
            default: Date.now
        }
    }],
    sentRequests: [{
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        sentAt: {
            type: Date,
            default: Date.now
        }
    }],
    settings: {
        notifications: {
            sound: { type: Boolean, default: true },
            desktop: { type: Boolean, default: true },
            email: { type: Boolean, default: false }
        },
        privacy: {
            lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
            profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
            status: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
            email: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'contacts' }
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        }
    },
    publicKey: String, // For end-to-end encryption
    deviceTokens: [String], // For push notifications
    bio: {
        type: String,
        maxlength: 300,
        default: '',
        trim: true
    },
    blockedUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        blockedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes for performance
// username and email already have unique indexes from schema definition
userSchema.index({ 'contacts.user': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Update last seen
userSchema.methods.updateLastSeen = function() {
    this.lastSeen = new Date();
    return this.save();
};

// Add contact method
userSchema.methods.addContact = function(contactId) {
    if (!this.contacts.some(contact => contact.user.toString() === contactId.toString())) {
        this.contacts.push({ user: contactId });
        return this.save();
    }
    return Promise.resolve(this);
};

// Remove contact method
userSchema.methods.removeContact = function(contactId) {
    this.contacts = this.contacts.filter(contact => 
        contact.user.toString() !== contactId.toString()
    );
    return this.save();
};

// Block/Unblock contact method
userSchema.methods.blockContact = function(contactId, block = true) {
    const contact = this.contacts.find(contact => 
        contact.user.toString() === contactId.toString()
    );
    if (contact) {
        contact.blocked = block;
        return this.save();
    }
    return Promise.resolve(this);
};

// Transform function to hide sensitive data
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.publicKey;
    delete user.deviceTokens;
    return user;
};

// Public profile method
userSchema.methods.getPublicProfile = function() {
    return {
        _id: this._id,
        username: this.username,
        fullName: this.fullName,
        email: this.email,
        avatar: this.avatar,
        status: this.status,
        statusMessage: this.statusMessage,
        lastSeen: this.lastSeen,
        isActive: this.isActive,
        bio: this.bio,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('User', userSchema);