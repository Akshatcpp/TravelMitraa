const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Information
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: false,
        trim: true
    },
    profilePicture: {
        type: String,
        default: null
    },

    // Location Preferences
    defaultLocation: {
        name: String,
        latitude: Number,
        longitude: Number,
        address: String
    },
    
    // Verification Status
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    
    // Reward System
    rewardPoints: {
        type: Number,
        default: 0
    },
    totalPointsEarned: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    badges: [{
        name: String,
        description: String,
        earnedAt: Date,
        iconUrl: String
    }],
    achievements: [{
        type: String,
        unlockedAt: Date,
        points: Number
    }],

    // Travel Statistics
    travelStats: {
        totalTrips: {
            type: Number,
            default: 0
        },
        totalDistance: {
            type: Number,
            default: 0
        },
        totalDuration: {
            type: Number,
            default: 0
        },
        placesVisited: {
            type: Number,
            default: 0
        },
        photosUploaded: {
            type: Number,
            default: 0
        },
        co2Saved: {
            type: Number,
            default: 0
        }
    },

    // Preferences
    preferences: {
        preferredTransportMode: {
            type: String,
            enum: ['driving', 'walking', 'cycling', 'public_transport'],
            default: 'driving'
        },
        avoidTolls: {
            type: Boolean,
            default: false
        },
        avoidHighways: {
            type: Boolean,
            default: false
        },
        preferScenicRoutes: {
            type: Boolean,
            default: false
        },
        language: {
            type: String,
            default: 'en'
        },
        units: {
            type: String,
            enum: ['metric', 'imperial'],
            default: 'metric'
        },
        notifications: {
            traffic: { type: Boolean, default: true },
            rewards: { type: Boolean, default: true },
            tripReminders: { type: Boolean, default: true },
            newFeatures: { type: Boolean, default: true }
        }
    },

    // Activity Tracking
    lastLoginAt: {
        type: Date,
        default: Date.now
    },
    lastActiveAt: {
        type: Date,
        default: Date.now
    },
    loginStreak: {
        type: Number,
        default: 0
    },
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockReason: String,

    // Privacy Settings
    privacy: {
        shareLocation: {
            type: Boolean,
            default: false
        },
        shareTrips: {
            type: Boolean,
            default: false
        },
        allowDataAnalytics: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ rewardPoints: -1 });
userSchema.index({ 'defaultLocation.latitude': 1, 'defaultLocation.longitude': 1 });

// Virtual for user level based on points
userSchema.virtual('userLevel').get(function() {
    const points = this.rewardPoints;
    if (points < 100) return 1;
    if (points < 500) return 2;
    if (points < 1000) return 3;
    if (points < 2500) return 4;
    if (points < 5000) return 5;
    return Math.floor(points / 1000) + 5;
});

// Virtual for next level points requirement
userSchema.virtual('nextLevelPoints').get(function() {
    const currentLevel = this.userLevel;
    const levelThresholds = [0, 100, 500, 1000, 2500, 5000];
    
    if (currentLevel <= 5) {
        return levelThresholds[currentLevel] - this.rewardPoints;
    }
    
    const nextThreshold = (currentLevel - 4) * 1000;
    return nextThreshold - this.rewardPoints;
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with cost of 12
        const hashedPassword = await bcrypt.hash(this.password, 12);
        this.password = hashedPassword;
        next();
    } catch (error) {
        next(error);
    }
});

// Update last active time
userSchema.pre('save', function(next) {
    if (this.isModified('lastLoginAt')) {
        this.lastActiveAt = new Date();
    }
    next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.addRewardPoints = function(points, reason = 'Activity') {
    this.rewardPoints += points;
    this.totalPointsEarned += points;
    
    // Check for level up
    const oldLevel = this.level;
    const newLevel = this.userLevel;
    
    if (newLevel > oldLevel) {
        this.level = newLevel;
        return {
            leveledUp: true,
            oldLevel,
            newLevel,
            pointsAdded: points
        };
    }
    
    return {
        leveledUp: false,
        pointsAdded: points,
        totalPoints: this.rewardPoints
    };
};

userSchema.methods.updateLoginStreak = function() {
    const now = new Date();
    const lastLogin = this.lastLoginAt;
    
    if (lastLogin) {
        const timeDiff = now.getTime() - lastLogin.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff === 1) {
            // Consecutive day login
            this.loginStreak += 1;
        } else if (daysDiff > 1) {
            // Streak broken
            this.loginStreak = 1;
        }
        // Same day login doesn't change streak
    } else {
        this.loginStreak = 1;
    }
    
    this.lastLoginAt = now;
    return this.loginStreak;
};

userSchema.methods.addBadge = function(badgeName, description, iconUrl = null) {
    const existingBadge = this.badges.find(badge => badge.name === badgeName);
    
    if (!existingBadge) {
        this.badges.push({
            name: badgeName,
            description,
            earnedAt: new Date(),
            iconUrl
        });
        return true;
    }
    
    return false;
};

userSchema.methods.toSafeObject = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

// Static methods
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function(username) {
    return this.findOne({ username: username.toLowerCase() });
};

userSchema.statics.getLeaderboard = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ rewardPoints: -1 })
        .limit(limit)
        .select('username fullName rewardPoints level travelStats badges');
};

module.exports = mongoose.model('User', userSchema);
