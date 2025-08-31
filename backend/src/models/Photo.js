const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
    // User and Trip Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    },
    
    // Photo Details
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    thumbnailUrl: String,
    fileSize: Number,
    mimeType: String,
    dimensions: {
        width: Number,
        height: Number
    },
    
    // Location Information
    location: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        accuracy: Number,
        altitude: Number,
        heading: Number
    },
    
    // Place Information
    place: {
        placeId: String,
        placeName: String,
        placeAddress: String,
        category: String,
        mapplsPlaceCode: String
    },
    
    // EXIF and Metadata
    exifData: {
        timestamp: Date,
        camera: String,
        location: {
            latitude: Number,
            longitude: Number
        },
        deviceInfo: String
    },
    
    // Verification and AR
    verification: {
        isVerified: {
            type: Boolean,
            default: false
        },
        verificationMethod: {
            type: String,
            enum: ['location_match', 'ar_recognition', 'manual_review', 'face_recognition', 'landmark_detection'],
            default: 'location_match'
        },
        verificationScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        verifiedAt: Date,
        verifiedBy: String,
        verificationData: {
            locationAccuracy: Number,
            landmarkConfidence: Number,
            arMatchScore: Number,
            manualReviewNotes: String
        }
    },
    
    // AR Features
    arData: {
        recognizedObjects: [{
            objectType: String,
            confidence: Number,
            boundingBox: {
                x: Number,
                y: Number,
                width: Number,
                height: Number
            }
        }],
        landmarks: [{
            name: String,
            confidence: Number,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        }],
        sceneAnalysis: {
            environment: String, // indoor, outdoor, etc.
            lighting: String,
            weather: String,
            timeOfDay: String
        }
    },
    
    // Reward System
    rewardPoints: {
        type: Number,
        default: 0
    },
    rewardStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    qualityScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    uniquenessScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    
    // Social Features
    isPublic: {
        type: Boolean,
        default: false
    },
    likes: [{
        userId: mongoose.Schema.Types.ObjectId,
        likedAt: Date
    }],
    comments: [{
        userId: mongoose.Schema.Types.ObjectId,
        text: String,
        createdAt: Date
    }],
    
    // Content Analysis
    analysis: {
        tags: [String],
        colors: [String],
        mood: String,
        composition: String,
        subjects: [String],
        inappropriateContent: {
            isInappropriate: Boolean,
            reasons: [String],
            confidence: Number
        }
    },
    
    // Status and Moderation
    status: {
        type: String,
        enum: ['processing', 'approved', 'rejected', 'flagged'],
        default: 'processing'
    },
    moderationFlags: [{
        flag: String,
        reason: String,
        flaggedBy: String,
        flaggedAt: Date
    }],
    
    // Challenges and Contests
    challenges: [{
        challengeId: String,
        challengeName: String,
        completed: Boolean,
        completedAt: Date
    }]
}, {
    timestamps: true
});

// Indexes for performance
photoSchema.index({ userId: 1, createdAt: -1 });
photoSchema.index({ tripId: 1 });
photoSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
photoSchema.index({ 'place.placeId': 1 });
photoSchema.index({ status: 1, rewardStatus: 1 });
photoSchema.index({ isPublic: 1, status: 1 });

// Geospatial index for location-based queries
photoSchema.index({ location: '2dsphere' });

// Instance methods
photoSchema.methods.verify = function(method, score = 100, data = {}) {
    this.verification.isVerified = true;
    this.verification.verificationMethod = method;
    this.verification.verificationScore = score;
    this.verification.verifiedAt = new Date();
    this.verification.verificationData = { ...this.verification.verificationData, ...data };
    
    // Award points based on verification score
    this.rewardPoints = Math.floor(score / 10) + 5; // 5-15 points based on score
    this.rewardStatus = 'approved';
    this.status = 'approved';
};

photoSchema.methods.reject = function(reason = 'Quality not met') {
    this.status = 'rejected';
    this.rewardStatus = 'rejected';
    this.rewardPoints = 0;
    this.moderationFlags.push({
        flag: 'rejected',
        reason,
        flaggedBy: 'system',
        flaggedAt: new Date()
    });
};

photoSchema.methods.calculateQualityScore = function() {
    let score = 50; // Base score
    
    // Resolution bonus
    if (this.dimensions) {
        const pixels = this.dimensions.width * this.dimensions.height;
        if (pixels > 2000000) score += 20; // 2MP+
        if (pixels > 8000000) score += 10; // 8MP+
    }
    
    // Location accuracy bonus
    if (this.location.accuracy && this.location.accuracy < 10) {
        score += 15; // High accuracy GPS
    }
    
    // EXIF data bonus
    if (this.exifData && this.exifData.timestamp) {
        score += 10; // Valid EXIF data
    }
    
    // Verification bonus
    if (this.verification.isVerified) {
        score += this.verification.verificationScore * 0.2;
    }
    
    this.qualityScore = Math.min(score, 100);
    return this.qualityScore;
};

photoSchema.methods.calculateUniquenessScore = async function() {
    // Find similar photos in the same area
    const nearbyPhotos = await mongoose.model('Photo').find({
        'location.latitude': {
            $gte: this.location.latitude - 0.001,
            $lte: this.location.latitude + 0.001
        },
        'location.longitude': {
            $gte: this.location.longitude - 0.001,
            $lte: this.location.longitude + 0.001
        },
        _id: { $ne: this._id },
        status: 'approved'
    });
    
    let uniquenessScore = 100;
    
    // Reduce score based on nearby photos
    const nearbyCount = nearbyPhotos.length;
    if (nearbyCount > 0) {
        uniquenessScore -= Math.min(nearbyCount * 10, 80);
    }
    
    // Check for same place photos
    if (this.place.placeId) {
        const samePlacePhotos = nearbyPhotos.filter(photo => 
            photo.place.placeId === this.place.placeId
        );
        uniquenessScore -= samePlacePhotos.length * 5;
    }
    
    this.uniquenessScore = Math.max(uniquenessScore, 10);
    return this.uniquenessScore;
};

photoSchema.methods.addLike = function(userId) {
    const existingLike = this.likes.find(like => like.userId.toString() === userId.toString());
    
    if (!existingLike) {
        this.likes.push({
            userId,
            likedAt: new Date()
        });
        return true;
    }
    
    return false;
};

photoSchema.methods.removeLike = function(userId) {
    const likeIndex = this.likes.findIndex(like => like.userId.toString() === userId.toString());
    
    if (likeIndex > -1) {
        this.likes.splice(likeIndex, 1);
        return true;
    }
    
    return false;
};

photoSchema.methods.addComment = function(userId, text) {
    this.comments.push({
        userId,
        text: text.trim(),
        createdAt: new Date()
    });
    
    return this.comments[this.comments.length - 1];
};

// Static methods
photoSchema.statics.findNearbyPhotos = function(latitude, longitude, radius = 1000, limit = 20) {
    return this.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                $maxDistance: radius
            }
        },
        status: 'approved',
        isPublic: true
    }).limit(limit).sort({ createdAt: -1 });
};

photoSchema.statics.findUserPhotos = function(userId, limit = 50) {
    return this.find({ userId, status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(limit);
};

photoSchema.statics.findPlacePhotos = function(placeId, limit = 20) {
    return this.find({ 
        'place.placeId': placeId, 
        status: 'approved',
        isPublic: true 
    })
        .sort({ createdAt: -1 })
        .limit(limit);
};

photoSchema.statics.getPhotoStatistics = function(userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalRewardPoints: { $sum: '$rewardPoints' },
                avgQualityScore: { $avg: '$qualityScore' }
            }
        }
    ]);
};

photoSchema.statics.getTrendingPhotos = function(timeframe = 'week', limit = 20) {
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
        case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return this.find({
        createdAt: { $gte: startDate },
        status: 'approved',
        isPublic: true
    })
    .sort({ 
        'likes.length': -1, 
        qualityScore: -1,
        createdAt: -1 
    })
    .limit(limit)
    .populate('userId', 'username fullName profilePicture');
};

// Pre-save middleware
photoSchema.pre('save', function(next) {
    // Auto-calculate quality score if not set
    if (this.qualityScore === 0) {
        this.calculateQualityScore();
    }
    
    next();
});

module.exports = mongoose.model('Photo', photoSchema);
