const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
    name: String,
    address: String,
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    placeId: String,
    estimatedDuration: Number, // minutes to spend at this location
    visitStatus: {
        type: String,
        enum: ['pending', 'visited', 'skipped'],
        default: 'pending'
    },
    visitedAt: Date,
    rewardPoints: {
        type: Number,
        default: 0
    },
    photos: [{
        url: String,
        uploadedAt: Date,
        verified: Boolean
    }]
});

const routeSegmentSchema = new mongoose.Schema({
    startWaypoint: waypointSchema,
    endWaypoint: waypointSchema,
    distance: Number,
    duration: Number,
    polyline: String,
    instructions: [String],
    trafficInfo: {
        level: String,
        incidents: [String],
        updatedAt: Date
    }
});

const tripSchema = new mongoose.Schema({
    // Basic Trip Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    
    // Trip Type and Status
    type: {
        type: String,
        enum: ['ai_planned', 'manual_planned', 'quick_route'],
        required: true
    },
    status: {
        type: String,
        enum: ['planned', 'in_progress', 'completed', 'cancelled'],
        default: 'planned'
    },
    
    // Location Data
    origin: {
        name: String,
        address: String,
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        placeId: String
    },
    destination: {
        name: String,
        address: String,
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        placeId: String
    },
    waypoints: [waypointSchema],
    
    // Route Information
    routes: [{
        type: {
            type: String,
            enum: ['fastest', 'shortest', 'economic', 'scenic'],
            default: 'fastest'
        },
        segments: [routeSegmentSchema],
        totalDistance: Number,
        totalDuration: Number,
        polylineEncoded: String,
        isSelected: {
            type: Boolean,
            default: false
        },
        insights: {
            fuelCost: Number,
            tollCost: Number,
            co2Emission: Number,
            difficultyScore: Number,
            trafficLevel: String
        }
    }],
    
    // Trip Planning Details
    planningPreferences: {
        transportMode: {
            type: String,
            enum: ['driving', 'walking', 'cycling', 'public_transport'],
            default: 'driving'
        },
        avoidTolls: Boolean,
        avoidHighways: Boolean,
        preferScenicRoutes: Boolean,
        maxDetourDistance: Number,
        timeConstraints: {
            departureTime: Date,
            arrivalTime: Date,
            maxTripDuration: Number
        }
    },
    
    // AI Planning Data (for AI-planned trips)
    aiPlanningData: {
        prompt: String,
        generatedAt: Date,
        confidence: Number,
        alternativesConsidered: Number,
        reasoningLog: [String],
        contextFactors: {
            weather: String,
            traffic: String,
            events: [String],
            userHistory: String
        }
    },
    
    // Timing
    scheduledStartTime: Date,
    actualStartTime: Date,
    scheduledEndTime: Date,
    actualEndTime: Date,
    
    // Progress Tracking
    currentLocation: {
        latitude: Number,
        longitude: Number,
        updatedAt: Date,
        heading: Number,
        speed: Number
    },
    currentWaypointIndex: {
        type: Number,
        default: 0
    },
    completionPercentage: {
        type: Number,
        default: 0
    },
    
    // Reward and Gamification
    totalRewardPoints: {
        type: Number,
        default: 0
    },
    challengesCompleted: [{
        challengeId: String,
        completedAt: Date,
        pointsEarned: Number
    }],
    
    // Media and Documentation
    photos: [{
        url: String,
        location: {
            latitude: Number,
            longitude: Number
        },
        waypointId: mongoose.Schema.Types.ObjectId,
        uploadedAt: Date,
        verified: Boolean,
        rewardPoints: Number
    }],
    
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
    
    // Analytics and Insights
    analytics: {
        actualVsPredicted: {
            duration: Number,
            distance: Number,
            fuelConsumption: Number
        },
        deviations: [{
            reason: String,
            location: {
                latitude: Number,
                longitude: Number
            },
            timestamp: Date,
            impactMinutes: Number
        }],
        trafficEncountered: [{
            location: String,
            severity: String,
            duration: Number,
            timestamp: Date
        }]
    },
    
    // Emergency and Safety
    emergencyContacts: [{
        name: String,
        phone: String,
        relation: String
    }],
    lastLocationUpdate: Date,
    
    // Trip Rating and Feedback
    rating: {
        overall: Number,
        route: Number,
        places: Number,
        navigation: Number
    },
    feedback: {
        text: String,
        issues: [String],
        suggestions: [String],
        submittedAt: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
tripSchema.index({ userId: 1, status: 1 });
tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ status: 1, scheduledStartTime: 1 });
tripSchema.index({ 'origin.latitude': 1, 'origin.longitude': 1 });
tripSchema.index({ 'destination.latitude': 1, 'destination.longitude': 1 });
tripSchema.index({ type: 1, status: 1 });

// Virtual for trip duration
tripSchema.virtual('actualDuration').get(function() {
    if (this.actualStartTime && this.actualEndTime) {
        return this.actualEndTime.getTime() - this.actualStartTime.getTime();
    }
    return null;
});

// Virtual for total distance of selected route
tripSchema.virtual('totalDistance').get(function() {
    const selectedRoute = this.routes.find(route => route.isSelected);
    return selectedRoute ? selectedRoute.totalDistance : 0;
});

// Virtual for estimated trip duration
tripSchema.virtual('estimatedDuration').get(function() {
    const selectedRoute = this.routes.find(route => route.isSelected);
    return selectedRoute ? selectedRoute.totalDuration : 0;
});

// Instance methods
tripSchema.methods.updateProgress = function(currentLat, currentLng, heading = 0, speed = 0) {
    this.currentLocation = {
        latitude: currentLat,
        longitude: currentLng,
        updatedAt: new Date(),
        heading,
        speed
    };
    
    // Calculate completion percentage based on distance covered
    const selectedRoute = this.routes.find(route => route.isSelected);
    if (selectedRoute) {
        // Simple calculation - can be enhanced with actual route progress
        const totalWaypoints = this.waypoints.length + 2; // including origin and destination
        const completedWaypoints = this.waypoints.filter(wp => wp.visitStatus === 'visited').length;
        this.completionPercentage = Math.round((completedWaypoints / totalWaypoints) * 100);
    }
    
    this.lastLocationUpdate = new Date();
};

tripSchema.methods.markWaypointVisited = function(waypointIndex, rewardPoints = 0) {
    if (this.waypoints[waypointIndex]) {
        this.waypoints[waypointIndex].visitStatus = 'visited';
        this.waypoints[waypointIndex].visitedAt = new Date();
        this.waypoints[waypointIndex].rewardPoints = rewardPoints;
        this.totalRewardPoints += rewardPoints;
        
        // Update current waypoint index
        this.currentWaypointIndex = Math.max(this.currentWaypointIndex, waypointIndex + 1);
        
        return true;
    }
    return false;
};

tripSchema.methods.addPhoto = function(photoUrl, location, waypointId = null, rewardPoints = 0) {
    const photo = {
        url: photoUrl,
        location,
        waypointId,
        uploadedAt: new Date(),
        verified: false,
        rewardPoints
    };
    
    this.photos.push(photo);
    this.totalRewardPoints += rewardPoints;
    
    return photo;
};

tripSchema.methods.completeTrip = function() {
    this.status = 'completed';
    this.actualEndTime = new Date();
    this.completionPercentage = 100;
    
    // Calculate completion bonus
    const completionBonus = Math.floor(this.totalDistance / 1000) * 2; // 2 points per km
    this.totalRewardPoints += completionBonus;
    
    return {
        completed: true,
        completionBonus,
        totalRewards: this.totalRewardPoints,
        duration: this.actualDuration
    };
};

tripSchema.methods.selectRoute = function(routeIndex) {
    // Deselect all routes
    this.routes.forEach(route => route.isSelected = false);
    
    // Select the specified route
    if (this.routes[routeIndex]) {
        this.routes[routeIndex].isSelected = true;
        return true;
    }
    
    return false;
};

tripSchema.methods.getNextWaypoint = function() {
    const nextIndex = this.currentWaypointIndex;
    
    if (nextIndex < this.waypoints.length) {
        return {
            waypoint: this.waypoints[nextIndex],
            index: nextIndex,
            isDestination: false
        };
    } else if (nextIndex === this.waypoints.length) {
        return {
            waypoint: this.destination,
            index: nextIndex,
            isDestination: true
        };
    }
    
    return null; // Trip completed
};

// Static methods
tripSchema.statics.findActiveTrips = function(userId) {
    return this.find({
        userId,
        status: 'in_progress'
    }).sort({ actualStartTime: -1 });
};

tripSchema.statics.findUpcomingTrips = function(userId) {
    return this.find({
        userId,
        status: 'planned',
        scheduledStartTime: { $gte: new Date() }
    }).sort({ scheduledStartTime: 1 });
};

tripSchema.statics.findCompletedTrips = function(userId, limit = 20) {
    return this.find({
        userId,
        status: 'completed'
    }).sort({ actualEndTime: -1 }).limit(limit);
};

tripSchema.statics.getTripStatistics = function(userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), status: 'completed' } },
        {
            $group: {
                _id: null,
                totalTrips: { $sum: 1 },
                totalDistance: { $sum: '$totalDistance' },
                totalDuration: { $sum: '$actualDuration' },
                totalRewards: { $sum: '$totalRewardPoints' },
                avgRating: { $avg: '$rating.overall' }
            }
        }
    ]);
};

module.exports = mongoose.model('Trip', tripSchema);
