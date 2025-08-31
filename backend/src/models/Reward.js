const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    // User Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Reward Details
    type: {
        type: String,
        enum: [
            'trip_completion',
            'place_visit',
            'photo_upload',
            'daily_login',
            'achievement_unlock',
            'social_interaction',
            'milestone_reached',
            'challenge_completed',
            'ar_interaction',
            'eco_friendly_route'
        ],
        required: true
    },
    
    points: {
        type: Number,
        required: true,
        min: 0
    },
    
    description: {
        type: String,
        required: true
    },
    
    // Related Entity References
    relatedTrip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    },
    relatedPlace: {
        placeId: String,
        placeName: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    relatedPhoto: {
        photoId: String,
        photoUrl: String
    },
    
    // Reward Metadata
    metadata: {
        category: String,
        subCategory: String,
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard', 'expert'],
            default: 'easy'
        },
        rarity: {
            type: String,
            enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
            default: 'common'
        },
        seasonality: String,
        location: {
            city: String,
            state: String,
            country: String
        }
    },
    
    // Validation and Verification
    isVerified: {
        type: Boolean,
        default: true
    },
    verificationMethod: {
        type: String,
        enum: ['automatic', 'photo_verification', 'location_verification', 'manual_review'],
        default: 'automatic'
    },
    verifiedAt: Date,
    verifiedBy: String,
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired'],
        default: 'approved'
    },
    
    // Expiry (for time-limited rewards)
    expiresAt: Date,
    
    // Bonus Information
    bonusMultiplier: {
        type: Number,
        default: 1.0,
        min: 1.0,
        max: 5.0
    },
    
    // Social Sharing
    isShared: {
        type: Boolean,
        default: false
    },
    shareableContent: {
        title: String,
        image: String,
        hashtags: [String]
    }
}, {
    timestamps: true
});

// Indexes for performance
rewardSchema.index({ userId: 1, createdAt: -1 });
rewardSchema.index({ type: 1, status: 1 });
rewardSchema.index({ userId: 1, type: 1 });
rewardSchema.index({ relatedTrip: 1 });
rewardSchema.index({ status: 1, expiresAt: 1 });

// Static methods
rewardSchema.statics.getUserRewards = function(userId, limit = 50) {
    return this.find({ userId, status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(limit);
};

rewardSchema.statics.getUserRewardSummary = function(userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), status: 'approved' } },
        {
            $group: {
                _id: '$type',
                totalPoints: { $sum: '$points' },
                count: { $sum: 1 },
                lastEarned: { $max: '$createdAt' }
            }
        },
        {
            $group: {
                _id: null,
                totalPoints: { $sum: '$totalPoints' },
                totalRewards: { $sum: '$count' },
                breakdown: {
                    $push: {
                        type: '$_id',
                        points: '$totalPoints',
                        count: '$count',
                        lastEarned: '$lastEarned'
                    }
                }
            }
        }
    ]);
};

rewardSchema.statics.getLeaderboard = function(timeframe = 'all', limit = 10) {
    const matchCondition = { status: 'approved' };
    
    // Add time filtering
    if (timeframe !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = null;
        }
        
        if (startDate) {
            matchCondition.createdAt = { $gte: startDate };
        }
    }
    
    return this.aggregate([
        { $match: matchCondition },
        {
            $group: {
                _id: '$userId',
                totalPoints: { $sum: '$points' },
                rewardCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                username: '$user.username',
                fullName: '$user.fullName',
                profilePicture: '$user.profilePicture',
                totalPoints: 1,
                rewardCount: 1,
                level: '$user.level'
            }
        },
        { $sort: { totalPoints: -1 } },
        { $limit: limit }
    ]);
};

// Instance methods
rewardSchema.methods.verify = function(method = 'automatic', verifiedBy = 'system') {
    this.isVerified = true;
    this.verificationMethod = method;
    this.verifiedAt = new Date();
    this.verifiedBy = verifiedBy;
    this.status = 'approved';
};

rewardSchema.methods.reject = function(reason = 'Invalid reward') {
    this.status = 'rejected';
    this.metadata.rejectionReason = reason;
};

rewardSchema.methods.expire = function() {
    this.status = 'expired';
};

// Check if reward is expired
rewardSchema.methods.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
};

module.exports = mongoose.model('Reward', rewardSchema);
