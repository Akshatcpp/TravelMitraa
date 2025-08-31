const mapplsService = require('../services/mapplsService');
const realTimeService = require('../services/realTimeService');
const Trip = require('../models/Trip');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Start trip navigation
 */
const startTrip = async (req, res) => {
    try {
        const { tripId } = req.params;

        const result = await realTimeService.startTripTracking(tripId, req.userId);

        res.json({
            success: true,
            message: 'Trip navigation started successfully',
            data: result.data
        });

    } catch (error) {
        logger.error('Start trip error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Stop trip navigation
 */
const stopTrip = async (req, res) => {
    try {
        const { tripId } = req.params;

        const result = await realTimeService.stopTripTracking(tripId, req.userId);

        res.json({
            success: true,
            message: 'Trip navigation stopped successfully',
            data: result.data
        });

    } catch (error) {
        logger.error('Stop trip error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update user location
 */
const updateLocation = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { latitude, longitude, accuracy, speed, heading, tripId } = req.body;

        const locationData = {
            userId: req.userId,
            tripId,
            location: {
                latitude,
                longitude,
                accuracy: accuracy || 0
            },
            speed: speed || 0,
            heading: heading || 0
        };

        // Use Socket.IO to handle real-time location update
        const io = req.app.get('io');
        if (io) {
            await realTimeService.handleLocationUpdate({ emit: () => {} }, locationData);
        }

        // Update user's last known location
        if (req.user) {
            req.user.lastActiveAt = new Date();
            await req.user.save();
        }

        res.json({
            success: true,
            message: 'Location updated successfully',
            data: {
                location: { latitude, longitude },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Update location error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update location'
        });
    }
};

/**
 * Get turn-by-turn directions
 */
const getDirections = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { origin, destination, waypoints = [], avoidTolls = false, avoidHighways = false } = req.body;

        const options = {
            profile: 'driving',
            alternatives: true,
            steps: true,
            geometries: 'polyline'
        };

        if (avoidTolls) {
            options.exclude = 'toll';
        }

        if (avoidHighways) {
            options.exclude = options.exclude ? `${options.exclude},motorway` : 'motorway';
        }

        const directions = await mapplsService.getRoute(origin, destination, waypoints, options);

        if (!directions.success) {
            return res.status(400).json({
                success: false,
                message: 'Unable to calculate directions',
                error: directions.error
            });
        }

        res.json({
            success: true,
            message: 'Directions retrieved successfully',
            data: directions.data
        });

    } catch (error) {
        logger.error('Get directions error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get directions'
        });
    }
};

/**
 * Get traffic information
 */
const getTrafficInfo = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { latitude, longitude, radius = 2000 } = req.query;

        const trafficInfo = await mapplsService.getTrafficInfo(
            parseFloat(latitude),
            parseFloat(longitude),
            parseInt(radius)
        );

        if (!trafficInfo.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to get traffic information',
                error: trafficInfo.error
            });
        }

        res.json({
            success: true,
            message: 'Traffic information retrieved successfully',
            data: trafficInfo.data
        });

    } catch (error) {
        logger.error('Get traffic info error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get traffic information'
        });
    }
};

/**
 * Snap coordinates to road
 */
const snapToRoad = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { coordinates } = req.body;

        const snappedResult = await mapplsService.snapToRoad(coordinates);

        if (!snappedResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to snap coordinates to road',
                error: snappedResult.error
            });
        }

        res.json({
            success: true,
            message: 'Coordinates snapped to road successfully',
            data: snappedResult.data
        });

    } catch (error) {
        logger.error('Snap to road error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to snap coordinates to road'
        });
    }
};

/**
 * Get estimated time of arrival
 */
const getETA = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { origin, destinations } = req.body;

        const etaResult = await mapplsService.getETA(origin, destinations);

        if (!etaResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to calculate ETA',
                error: etaResult.error
            });
        }

        res.json({
            success: true,
            message: 'ETA calculated successfully',
            data: etaResult.data
        });

    } catch (error) {
        logger.error('Get ETA error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate ETA'
        });
    }
};

/**
 * Get distance matrix
 */
const getDistanceMatrix = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { origins, destinations } = req.body;

        const matrixResult = await mapplsService.getDistanceMatrix(origins, destinations);

        if (!matrixResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to calculate distance matrix',
                error: matrixResult.error
            });
        }

        res.json({
            success: true,
            message: 'Distance matrix calculated successfully',
            data: matrixResult.data
        });

    } catch (error) {
        logger.error('Distance matrix error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate distance matrix'
        });
    }
};

/**
 * Geocode address
 */
const geocodeAddress = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { address, region = 'IND' } = req.query;

        const geocodeResult = await mapplsService.geocode(address, region);

        if (!geocodeResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to geocode address',
                error: geocodeResult.error
            });
        }

        res.json({
            success: true,
            message: 'Address geocoded successfully',
            data: geocodeResult.data
        });

    } catch (error) {
        logger.error('Geocode error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to geocode address'
        });
    }
};

/**
 * Reverse geocode coordinates
 */
const reverseGeocode = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { latitude, longitude } = req.query;

        const reverseResult = await mapplsService.reverseGeocode(
            parseFloat(latitude),
            parseFloat(longitude)
        );

        if (!reverseResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to reverse geocode coordinates',
                error: reverseResult.error
            });
        }

        res.json({
            success: true,
            message: 'Coordinates reverse geocoded successfully',
            data: reverseResult.data
        });

    } catch (error) {
        logger.error('Reverse geocode error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to reverse geocode coordinates'
        });
    }
};

/**
 * Get static map
 */
const getStaticMap = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { latitude, longitude, zoom = 15, size = '400x400', markers } = req.query;

        const center = {
            lat: parseFloat(latitude),
            lng: parseFloat(longitude)
        };

        let markerArray = [];
        if (markers) {
            try {
                markerArray = JSON.parse(markers);
            } catch (e) {
                // Ignore marker parsing errors
            }
        }

        const mapResult = await mapplsService.getStaticMap(
            center,
            parseInt(zoom),
            size,
            markerArray
        );

        if (!mapResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to generate static map',
                error: mapResult.error
            });
        }

        res.json({
            success: true,
            message: 'Static map URL generated successfully',
            data: {
                mapUrl: mapResult.url,
                center,
                zoom: parseInt(zoom),
                size
            }
        });

    } catch (error) {
        logger.error('Static map error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate static map'
        });
    }
};

/**
 * Send emergency alert
 */
const sendEmergencyAlert = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { latitude, longitude, emergencyType, message = '' } = req.body;

        const location = { latitude, longitude };
        
        await realTimeService.handleEmergencyAlert(req.userId, location, emergencyType);

        logger.warn(`Emergency alert sent by user ${req.userId}: ${emergencyType} at ${latitude}, ${longitude}`);

        res.json({
            success: true,
            message: 'Emergency alert sent successfully',
            data: {
                alertId: `emergency_${Date.now()}`,
                location,
                emergencyType,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Emergency alert error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send emergency alert'
        });
    }
};

/**
 * Share live location
 */
const shareLocation = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { shareWithUserIds, duration = 60 } = req.body; // Duration in minutes

        const durationMs = duration * 60 * 1000; // Convert to milliseconds
        
        const shareSession = await realTimeService.shareLiveLocation(
            req.userId,
            shareWithUserIds,
            durationMs
        );

        res.json({
            success: true,
            message: 'Location sharing started successfully',
            data: {
                sessionId: shareSession.sessionId,
                duration: duration,
                shareWithUsers: shareWithUserIds.length,
                endTime: shareSession.endTime
            }
        });

    } catch (error) {
        logger.error('Share location error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get trip status
 */
const getTripStatus = async (req, res) => {
    try {
        const { tripId } = req.params;

        const trip = await Trip.findOne({ _id: tripId, userId: req.userId })
            .populate('userId', 'username fullName profilePicture');

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found'
            });
        }

        const nextWaypoint = trip.getNextWaypoint();

        res.json({
            success: true,
            message: 'Trip status retrieved successfully',
            data: {
                trip,
                nextWaypoint,
                progress: {
                    completionPercentage: trip.completionPercentage,
                    currentWaypointIndex: trip.currentWaypointIndex,
                    visitedWaypoints: trip.waypoints.filter(wp => wp.visitStatus === 'visited').length,
                    totalWaypoints: trip.waypoints.length
                },
                realTimeData: {
                    currentLocation: trip.currentLocation,
                    lastLocationUpdate: trip.lastLocationUpdate,
                    isTracking: trip.status === 'in_progress'
                }
            }
        });

    } catch (error) {
        logger.error('Get trip status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get trip status'
        });
    }
};

/**
 * Mark waypoint as reached
 */
const markWaypointReached = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tripId, waypointIndex, currentLocation } = req.body;

        const trip = await Trip.findOne({ _id: tripId, userId: req.userId });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found'
            });
        }

        if (trip.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Trip is not in progress'
            });
        }

        // Verify waypoint exists
        if (!trip.waypoints[waypointIndex]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid waypoint index'
            });
        }

        // Mark waypoint as visited
        const waypoint = trip.waypoints[waypointIndex];
        const rewardPoints = waypoint.rewardPoints || 25;
        
        const marked = trip.markWaypointVisited(waypointIndex, rewardPoints);

        if (!marked) {
            return res.status(400).json({
                success: false,
                message: 'Failed to mark waypoint as reached'
            });
        }

        await trip.save();

        // Award user points
        const user = await User.findById(req.userId);
        if (user) {
            const rewardUpdate = user.addRewardPoints(rewardPoints, 'Waypoint visited');
            user.travelStats.placesVisited += 1;
            await user.save();

            // Emit reward notification via Socket.IO
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${req.userId}`).emit('reward_earned', {
                    type: 'place_visit',
                    points: rewardPoints,
                    description: `Visited ${waypoint.name}`,
                    totalPoints: user.rewardPoints,
                    leveledUp: rewardUpdate.leveledUp
                });
            }
        }

        logger.info(`Waypoint reached: ${waypoint.name} for trip ${tripId}`);

        res.json({
            success: true,
            message: 'Waypoint marked as reached successfully',
            data: {
                waypoint,
                rewardPoints,
                tripProgress: {
                    completionPercentage: trip.completionPercentage,
                    currentWaypointIndex: trip.currentWaypointIndex
                }
            }
        });

    } catch (error) {
        logger.error('Mark waypoint reached error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to mark waypoint as reached'
        });
    }
};

/**
 * Reroute trip
 */
const reroute = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tripId, currentLocation, reason = 'user_preference' } = req.body;

        const trip = await Trip.findOne({ _id: tripId, userId: req.userId });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found'
            });
        }

        if (trip.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Trip is not in progress'
            });
        }

        // Get remaining waypoints
        const remainingWaypoints = trip.waypoints.slice(trip.currentWaypointIndex);
        
        // Calculate new route from current location
        const newRoute = await mapplsService.getRoute(
            { lat: currentLocation.latitude, lng: currentLocation.longitude },
            trip.destination,
            remainingWaypoints
        );

        if (!newRoute.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to calculate new route',
                error: newRoute.error
            });
        }

        // Update trip with new route
        const updatedRoute = {
            type: 'rerouted',
            totalDistance: newRoute.data.routes[0].distance,
            totalDuration: newRoute.data.routes[0].duration,
            polylineEncoded: newRoute.data.routes[0].geometry,
            isSelected: true,
            insights: newRoute.data.routes[0].insights
        };

        // Deselect old routes and add new one
        trip.routes.forEach(route => route.isSelected = false);
        trip.routes.push(updatedRoute);

        // Log the reroute
        trip.analytics.deviations.push({
            reason,
            location: currentLocation,
            timestamp: new Date(),
            impactMinutes: 0 // Could be calculated
        });

        await trip.save();

        // Emit reroute notification
        const io = req.app.get('io');
        if (io) {
            io.to(`trip_${tripId}`).emit('trip_rerouted', {
                tripId,
                newRoute: newRoute.data,
                reason,
                timestamp: new Date().toISOString()
            });
        }

        logger.info(`Trip rerouted: ${tripId} due to ${reason}`);

        res.json({
            success: true,
            message: 'Route recalculated successfully',
            data: {
                newRoute: newRoute.data,
                reason,
                estimatedTimeSaved: 0, // Could be calculated
                rerouteId: trip.routes.length - 1
            }
        });

    } catch (error) {
        logger.error('Reroute error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to reroute trip'
        });
    }
};

/**
 * Get active trips
 */
const getActiveTrips = async (req, res) => {
    try {
        const activeTrips = await Trip.findActiveTrips(req.userId);

        res.json({
            success: true,
            message: 'Active trips retrieved successfully',
            data: {
                trips: activeTrips,
                count: activeTrips.length
            }
        });

    } catch (error) {
        logger.error('Get active trips error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get active trips'
        });
    }
};

/**
 * Pause trip
 */
const pauseTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const { reason = 'User requested', expectedDuration } = req.body;

        const trip = await Trip.findOne({ _id: tripId, userId: req.userId });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found'
            });
        }

        if (trip.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Trip is not in progress'
            });
        }

        // Add pause record to analytics
        trip.analytics.deviations.push({
            reason: `Trip paused: ${reason}`,
            location: trip.currentLocation,
            timestamp: new Date(),
            impactMinutes: expectedDuration || 0
        });

        await trip.save();

        // Emit pause notification
        const io = req.app.get('io');
        if (io) {
            io.to(`trip_${tripId}`).emit('trip_paused', {
                tripId,
                reason,
                expectedDuration,
                timestamp: new Date().toISOString()
            });
        }

        logger.info(`Trip paused: ${tripId} - ${reason}`);

        res.json({
            success: true,
            message: 'Trip paused successfully',
            data: {
                tripId,
                pausedAt: new Date().toISOString(),
                reason,
                expectedDuration
            }
        });

    } catch (error) {
        logger.error('Pause trip error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to pause trip'
        });
    }
};

/**
 * Resume trip
 */
const resumeTrip = async (req, res) => {
    try {
        const { tripId } = req.params;

        const trip = await Trip.findOne({ _id: tripId, userId: req.userId });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found'
            });
        }

        if (trip.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Trip is not in progress or paused'
            });
        }

        // Emit resume notification
        const io = req.app.get('io');
        if (io) {
            io.to(`trip_${tripId}`).emit('trip_resumed', {
                tripId,
                timestamp: new Date().toISOString()
            });
        }

        logger.info(`Trip resumed: ${tripId}`);

        res.json({
            success: true,
            message: 'Trip resumed successfully',
            data: {
                tripId,
                resumedAt: new Date().toISOString(),
                nextWaypoint: trip.getNextWaypoint()
            }
        });

    } catch (error) {
        logger.error('Resume trip error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to resume trip'
        });
    }
};

module.exports = {
    startTrip,
    stopTrip,
    updateLocation,
    getDirections,
    getTrafficInfo,
    snapToRoad,
    getETA,
    getDistanceMatrix,
    geocodeAddress,
    reverseGeocode,
    getStaticMap,
    sendEmergencyAlert,
    shareLocation,
    getTripStatus,
    markWaypointReached,
    reroute,
    getActiveTrips,
    pauseTrip,
    resumeTrip
};
