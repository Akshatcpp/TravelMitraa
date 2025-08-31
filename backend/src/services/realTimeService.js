const Trip = require('../models/Trip');
const User = require('../models/User');
const Reward = require('../models/Reward');
const logger = require('../utils/logger');
const geolib = require('geolib');

class RealTimeService {
    constructor() {
        this.io = null;
        this.activeTrips = new Map();
        this.userLocations = new Map();
    }

    /**
     * Initialize the real-time service with Socket.IO instance
     */
    initialize(io) {
        this.io = io;
        logger.info('Real-time service initialized');
    }

    /**
     * Handle location updates from users
     */
    async handleLocationUpdate(socket, data) {
        try {
            const { userId, tripId, location, speed, heading } = data;

            if (!userId || !location || !location.latitude || !location.longitude) {
                socket.emit('error', { message: 'Invalid location data' });
                return;
            }

            // Update user location cache
            this.userLocations.set(userId, {
                ...location,
                speed: speed || 0,
                heading: heading || 0,
                updatedAt: new Date(),
                socketId: socket.id
            });

            // If user is on a trip, update trip progress
            if (tripId) {
                await this.updateTripProgress(userId, tripId, location, speed, heading);
            }

            // Emit location update to user's room
            this.io.to(`user_${userId}`).emit('location_updated', {
                location,
                speed,
                heading,
                timestamp: new Date().toISOString()
            });

            // If on trip, emit to trip room
            if (tripId) {
                this.io.to(`trip_${tripId}`).emit('trip_location_update', {
                    userId,
                    location,
                    speed,
                    heading,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            logger.error('Location update error:', error.message);
            socket.emit('error', { message: 'Failed to process location update' });
        }
    }

    /**
     * Update trip progress based on location
     */
    async updateTripProgress(userId, tripId, location, speed = 0, heading = 0) {
        try {
            const trip = await Trip.findOne({ _id: tripId, userId, status: 'in_progress' });
            
            if (!trip) {
                logger.warn(`Trip ${tripId} not found or not in progress for user ${userId}`);
                return;
            }

            // Update trip location
            trip.updateProgress(location.latitude, location.longitude, heading, speed);

            // Check if user has reached any waypoints
            const reachedWaypoints = await this.checkWaypointProximity(trip, location);
            
            // Check if user has reached destination
            const reachedDestination = this.checkDestinationProximity(trip, location);

            // Save trip updates
            await trip.save();

            // Handle waypoint arrivals
            for (const waypoint of reachedWaypoints) {
                await this.handleWaypointArrival(trip, waypoint);
            }

            // Handle destination arrival
            if (reachedDestination) {
                await this.handleDestinationArrival(trip);
            }

            // Emit progress update
            this.io.to(`trip_${tripId}`).emit('trip_progress_update', {
                tripId,
                userId,
                progress: {
                    currentLocation: location,
                    completionPercentage: trip.completionPercentage,
                    currentWaypointIndex: trip.currentWaypointIndex,
                    reachedWaypoints,
                    reachedDestination
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Trip progress update error:', error.message);
        }
    }

    /**
     * Check if user is near any waypoints
     */
    async checkWaypointProximity(trip, userLocation, proximityThreshold = 100) {
        const reachedWaypoints = [];
        
        for (let i = 0; i < trip.waypoints.length; i++) {
            const waypoint = trip.waypoints[i];
            
            if (waypoint.visitStatus === 'visited') continue;

            const distance = geolib.getDistance(
                { latitude: userLocation.latitude, longitude: userLocation.longitude },
                { latitude: waypoint.latitude, longitude: waypoint.longitude }
            );

            if (distance <= proximityThreshold) {
                reachedWaypoints.push({
                    index: i,
                    waypoint,
                    distance
                });
            }
        }

        return reachedWaypoints;
    }

    /**
     * Check if user has reached destination
     */
    checkDestinationProximity(trip, userLocation, proximityThreshold = 100) {
        if (!trip.destination) return false;

        const distance = geolib.getDistance(
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: trip.destination.latitude, longitude: trip.destination.longitude }
        );

        return distance <= proximityThreshold;
    }

    /**
     * Handle waypoint arrival
     */
    async handleWaypointArrival(trip, reachedWaypoint) {
        try {
            const { index, waypoint } = reachedWaypoint;
            
            // Mark waypoint as visited
            const rewardPoints = waypoint.rewardPoints || 25;
            trip.markWaypointVisited(index, rewardPoints);

            // Award user points
            const user = await User.findById(trip.userId);
            if (user) {
                const rewardUpdate = user.addRewardPoints(rewardPoints, 'Waypoint visited');
                user.travelStats.placesVisited += 1;
                await user.save();

                // Create reward record
                const reward = new Reward({
                    userId: trip.userId,
                    type: 'place_visit',
                    points: rewardPoints,
                    description: `Visited ${waypoint.name}`,
                    relatedTrip: trip._id,
                    relatedPlace: {
                        placeId: waypoint.placeId,
                        placeName: waypoint.name,
                        coordinates: {
                            latitude: waypoint.latitude,
                            longitude: waypoint.longitude
                        }
                    }
                });

                await reward.save();

                // Emit reward notification
                this.io.to(`user_${trip.userId}`).emit('reward_earned', {
                    type: 'place_visit',
                    points: rewardPoints,
                    description: reward.description,
                    totalPoints: user.rewardPoints,
                    leveledUp: rewardUpdate.leveledUp
                });
            }

            // Emit waypoint reached notification
            this.io.to(`trip_${trip._id}`).emit('waypoint_reached', {
                tripId: trip._id,
                waypointIndex: index,
                waypoint,
                rewardPoints,
                timestamp: new Date().toISOString()
            });

            logger.info(`Waypoint reached: ${waypoint.name} for trip ${trip._id}`);

        } catch (error) {
            logger.error('Waypoint arrival handling error:', error.message);
        }
    }

    /**
     * Handle destination arrival
     */
    async handleDestinationArrival(trip) {
        try {
            // Complete the trip
            const completionResult = trip.completeTrip();
            
            // Award user points for trip completion
            const user = await User.findById(trip.userId);
            if (user) {
                const rewardUpdate = user.addRewardPoints(completionResult.completionBonus, 'Trip completed');
                user.travelStats.totalTrips += 1;
                user.travelStats.totalDistance += trip.totalDistance || 0;
                user.travelStats.totalDuration += completionResult.duration || 0;
                await user.save();

                // Create completion reward record
                const reward = new Reward({
                    userId: trip.userId,
                    type: 'trip_completion',
                    points: completionResult.completionBonus,
                    description: `Completed trip: ${trip.title}`,
                    relatedTrip: trip._id
                });

                await reward.save();

                // Check for achievement unlocks
                await this.checkTripAchievements(user, trip);

                // Emit completion notification
                this.io.to(`user_${trip.userId}`).emit('trip_completed', {
                    tripId: trip._id,
                    title: trip.title,
                    completionBonus: completionResult.completionBonus,
                    totalRewards: completionResult.totalRewards,
                    duration: completionResult.duration,
                    leveledUp: rewardUpdate.leveledUp,
                    newLevel: rewardUpdate.newLevel
                });
            }

            // Remove from active trips
            this.activeTrips.delete(trip._id.toString());

            // Emit to trip room
            this.io.to(`trip_${trip._id}`).emit('trip_destination_reached', {
                tripId: trip._id,
                completionResult,
                timestamp: new Date().toISOString()
            });

            logger.info(`Trip completed: ${trip._id} for user ${trip.userId}`);

        } catch (error) {
            logger.error('Destination arrival handling error:', error.message);
        }
    }

    /**
     * Check for trip-related achievements
     */
    async checkTripAchievements(user, trip) {
        const newBadges = [];

        // First trip badge
        if (user.travelStats.totalTrips === 1) {
            const badgeAdded = user.addBadge(
                'First Journey',
                'Completed your first trip',
                '/badges/first-journey.png'
            );
            if (badgeAdded) newBadges.push('First Journey');
        }

        // Distance milestones
        const totalDistanceKm = user.travelStats.totalDistance / 1000;
        const distanceMilestones = [
            { km: 100, name: 'Century Rider', desc: 'Traveled 100 km' },
            { km: 500, name: 'Road Warrior', desc: 'Traveled 500 km' },
            { km: 1000, name: 'Kilometer King', desc: 'Traveled 1000 km' },
            { km: 5000, name: 'Explorer Extraordinaire', desc: 'Traveled 5000 km' }
        ];

        for (const milestone of distanceMilestones) {
            if (totalDistanceKm >= milestone.km) {
                const badgeAdded = user.addBadge(milestone.name, milestone.desc);
                if (badgeAdded) newBadges.push(milestone.name);
            }
        }

        // Trip count milestones
        const tripMilestones = [
            { count: 5, name: 'Regular Traveler', desc: 'Completed 5 trips' },
            { count: 10, name: 'Frequent Flyer', desc: 'Completed 10 trips' },
            { count: 25, name: 'Journey Master', desc: 'Completed 25 trips' },
            { count: 50, name: 'Navigation Legend', desc: 'Completed 50 trips' }
        ];

        for (const milestone of tripMilestones) {
            if (user.travelStats.totalTrips >= milestone.count) {
                const badgeAdded = user.addBadge(milestone.name, milestone.desc);
                if (badgeAdded) newBadges.push(milestone.name);
            }
        }

        // Save user if new badges were added
        if (newBadges.length > 0) {
            await user.save();

            // Emit badge notifications
            this.io.to(`user_${user._id}`).emit('badges_earned', {
                newBadges: newBadges.map(name => {
                    const badge = user.badges.find(b => b.name === name);
                    return {
                        name: badge.name,
                        description: badge.description,
                        earnedAt: badge.earnedAt
                    };
                }),
                totalBadges: user.badges.length
            });
        }
    }

    /**
     * Start trip tracking
     */
    async startTripTracking(tripId, userId) {
        try {
            const trip = await Trip.findOne({ _id: tripId, userId });
            
            if (!trip) {
                throw new Error('Trip not found');
            }

            if (trip.status !== 'planned') {
                throw new Error('Trip is not in planned status');
            }

            // Update trip status
            trip.status = 'in_progress';
            trip.actualStartTime = new Date();
            await trip.save();

            // Add to active trips
            this.activeTrips.set(tripId, {
                tripId,
                userId,
                startTime: new Date(),
                lastUpdate: new Date()
            });

            // Emit trip started event
            this.io.to(`user_${userId}`).emit('trip_started', {
                tripId,
                startTime: trip.actualStartTime,
                title: trip.title
            });

            this.io.to(`trip_${tripId}`).emit('trip_tracking_started', {
                tripId,
                userId,
                startTime: trip.actualStartTime
            });

            logger.info(`Trip tracking started: ${tripId} for user ${userId}`);

            return {
                success: true,
                message: 'Trip tracking started',
                data: { tripId, startTime: trip.actualStartTime }
            };

        } catch (error) {
            logger.error('Start trip tracking error:', error.message);
            throw error;
        }
    }

    /**
     * Stop trip tracking
     */
    async stopTripTracking(tripId, userId) {
        try {
            const trip = await Trip.findOne({ _id: tripId, userId });
            
            if (!trip) {
                throw new Error('Trip not found');
            }

            if (trip.status !== 'in_progress') {
                throw new Error('Trip is not in progress');
            }

            // Complete the trip if not already completed
            if (trip.status !== 'completed') {
                const completionResult = trip.completeTrip();
                await trip.save();

                // Award completion rewards
                await this.handleDestinationArrival(trip);
            }

            // Remove from active trips
            this.activeTrips.delete(tripId);

            // Emit trip stopped event
            this.io.to(`user_${userId}`).emit('trip_stopped', {
                tripId,
                endTime: trip.actualEndTime,
                duration: trip.actualDuration
            });

            this.io.to(`trip_${tripId}`).emit('trip_tracking_stopped', {
                tripId,
                userId,
                endTime: trip.actualEndTime
            });

            logger.info(`Trip tracking stopped: ${tripId} for user ${userId}`);

            return {
                success: true,
                message: 'Trip tracking stopped',
                data: { tripId, endTime: trip.actualEndTime }
            };

        } catch (error) {
            logger.error('Stop trip tracking error:', error.message);
            throw error;
        }
    }

    /**
     * Get real-time traffic updates for active trips
     */
    async broadcastTrafficUpdates() {
        try {
            for (const [tripId, tripInfo] of this.activeTrips) {
                const trip = await Trip.findById(tripId);
                
                if (!trip || trip.status !== 'in_progress') {
                    this.activeTrips.delete(tripId);
                    continue;
                }

                // Get traffic updates for the route
                const selectedRoute = trip.routes.find(route => route.isSelected);
                if (selectedRoute && selectedRoute.polylineEncoded) {
                    try {
                        // This would integrate with real traffic API
                        const trafficUpdate = {
                            tripId,
                            trafficLevel: this.estimateTrafficLevel(),
                            incidents: this.generateTrafficIncidents(),
                            estimatedDelay: Math.floor(Math.random() * 15), // 0-15 minutes
                            alternativeRoute: null,
                            timestamp: new Date().toISOString()
                        };

                        // Emit traffic update to trip room
                        this.io.to(`trip_${tripId}`).emit('traffic_update', trafficUpdate);

                    } catch (error) {
                        logger.warn(`Error getting traffic update for trip ${tripId}:`, error.message);
                    }
                }
            }
        } catch (error) {
            logger.error('Traffic updates broadcast error:', error.message);
        }
    }

    /**
     * Estimate current traffic level
     */
    estimateTrafficLevel() {
        const hour = new Date().getHours();
        
        if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
            return 'high';
        } else if ((hour >= 11 && hour <= 16) || (hour >= 21 && hour <= 23)) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Generate traffic incidents (placeholder)
     */
    generateTrafficIncidents() {
        // This would integrate with real traffic incident API
        const incidents = [
            'Road construction on NH1',
            'Heavy traffic near Airport',
            'Weather affecting visibility'
        ];

        // Randomly return 0-1 incidents
        if (Math.random() > 0.7) {
            return [incidents[Math.floor(Math.random() * incidents.length)]];
        }
        
        return [];
    }

    /**
     * Send navigation instructions
     */
    async sendNavigationInstructions(tripId, userId, currentLocation) {
        try {
            const trip = await Trip.findOne({ _id: tripId, userId, status: 'in_progress' });
            
            if (!trip) return;

            const nextWaypoint = trip.getNextWaypoint();
            
            if (!nextWaypoint) {
                // Trip completed
                return;
            }

            const { waypoint, isDestination } = nextWaypoint;
            
            // Calculate distance and bearing to next waypoint
            const distance = geolib.getDistance(
                { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                { latitude: waypoint.latitude, longitude: waypoint.longitude }
            );

            const bearing = geolib.getBearing(
                { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                { latitude: waypoint.latitude, longitude: waypoint.longitude }
            );

            const instruction = this.generateNavigationInstruction(distance, bearing, waypoint, isDestination);

            // Emit navigation instruction
            this.io.to(`user_${userId}`).emit('navigation_instruction', {
                tripId,
                instruction,
                nextWaypoint: waypoint,
                distance,
                bearing,
                isDestination,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Navigation instructions error:', error.message);
        }
    }

    /**
     * Generate navigation instruction text
     */
    generateNavigationInstruction(distance, bearing, waypoint, isDestination) {
        const distanceText = distance < 1000 
            ? `${distance} meters` 
            : `${(distance / 1000).toFixed(1)} km`;

        const direction = this.bearingToDirection(bearing);
        const destination = isDestination ? 'destination' : 'waypoint';

        if (distance < 100) {
            return `You have arrived at ${waypoint.name}`;
        } else if (distance < 500) {
            return `${destination} ${waypoint.name} is ${distanceText} ahead`;
        } else {
            return `Continue ${direction} for ${distanceText} towards ${waypoint.name}`;
        }
    }

    /**
     * Convert bearing to direction text
     */
    bearingToDirection(bearing) {
        const directions = [
            'north', 'northeast', 'east', 'southeast',
            'south', 'southwest', 'west', 'northwest'
        ];
        
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    }

    /**
     * Handle emergency alerts
     */
    async handleEmergencyAlert(userId, location, emergencyType = 'general') {
        try {
            const user = await User.findById(userId);
            
            if (!user) return;

            const emergencyData = {
                userId,
                userName: user.fullName,
                location,
                emergencyType,
                timestamp: new Date().toISOString(),
                alertId: `emergency_${Date.now()}`
            };

            // Emit to emergency services (if configured)
            this.io.emit('emergency_alert', emergencyData);

            // Emit to user's emergency contacts (if implemented)
            this.io.to(`user_${userId}`).emit('emergency_alert_sent', {
                message: 'Emergency alert has been sent',
                alertId: emergencyData.alertId
            });

            logger.warn(`Emergency alert from user ${userId}: ${emergencyType} at ${location.latitude}, ${location.longitude}`);

        } catch (error) {
            logger.error('Emergency alert error:', error.message);
        }
    }

    /**
     * Share live location with others
     */
    async shareLiveLocation(userId, shareWithUserIds, duration = 3600000) { // Default 1 hour
        try {
            const user = await User.findById(userId);
            
            if (!user || !user.privacy.shareLocation) {
                throw new Error('Location sharing not allowed');
            }

            const shareSession = {
                sessionId: `share_${Date.now()}`,
                userId,
                userName: user.fullName,
                shareWithUserIds,
                startTime: new Date(),
                endTime: new Date(Date.now() + duration),
                isActive: true
            };

            // Emit sharing started to shared users
            for (const shareWithUserId of shareWithUserIds) {
                this.io.to(`user_${shareWithUserId}`).emit('live_location_shared', {
                    from: {
                        userId,
                        userName: user.fullName,
                        profilePicture: user.profilePicture
                    },
                    sessionId: shareSession.sessionId,
                    duration: duration / 1000 / 60, // minutes
                    startTime: shareSession.startTime
                });
            }

            // Auto-stop sharing after duration
            setTimeout(() => {
                this.stopLocationSharing(shareSession.sessionId);
            }, duration);

            return shareSession;

        } catch (error) {
            logger.error('Share live location error:', error.message);
            throw error;
        }
    }

    /**
     * Stop location sharing
     */
    stopLocationSharing(sessionId) {
        // Emit sharing stopped event
        this.io.emit('live_location_sharing_stopped', {
            sessionId,
            timestamp: new Date().toISOString()
        });

        logger.info(`Location sharing stopped: ${sessionId}`);
    }

    /**
     * Get active trips summary
     */
    getActiveTripsInfo() {
        const activeTripsArray = Array.from(this.activeTrips.values());
        
        return {
            totalActiveTrips: activeTripsArray.length,
            activeTrips: activeTripsArray,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Get connected users count
     */
    getConnectedUsersCount() {
        return this.userLocations.size;
    }

    /**
     * Clean up old location data
     */
    cleanupOldData() {
        const cutoffTime = Date.now() - 30 * 60 * 1000; // 30 minutes ago
        
        for (const [userId, locationData] of this.userLocations) {
            if (locationData.updatedAt.getTime() < cutoffTime) {
                this.userLocations.delete(userId);
            }
        }

        logger.info(`Cleaned up old location data. Active users: ${this.userLocations.size}`);
    }
}

// Create singleton instance
const realTimeService = new RealTimeService();

// Start periodic cleanup
setInterval(() => {
    realTimeService.cleanupOldData();
}, 5 * 60 * 1000); // Every 5 minutes

// Start periodic traffic updates
setInterval(() => {
    realTimeService.broadcastTrafficUpdates();
}, 2 * 60 * 1000); // Every 2 minutes

module.exports = realTimeService;
