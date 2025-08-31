const aiPlannerService = require('../services/aiPlannerService');
const mapplsService = require('../services/mapplsService');
const Trip = require('../models/Trip');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const geolib = require('geolib');

/**
 * Generate AI-powered trip plan
 */
const generateAIPlan = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            origin,
            destination,
            interests = [],
            budget = 'medium',
            travelMode = 'driving',
            timeConstraints = {},
            groupSize = 1
        } = req.body;

        // Get user preferences if authenticated
        let userPreferences = {};
        if (req.user) {
            userPreferences = req.user.preferences || {};
        }

        const planningRequest = {
            origin,
            destination,
            userPreferences,
            timeConstraints,
            budget,
            interests,
            travelMode,
            groupSize
        };

        logger.info(`Generating AI plan for user ${req.userId || 'anonymous'} from ${origin.name || 'unknown'} to ${destination.name || 'unknown'}`);

        const aiPlan = await aiPlannerService.generateTripPlan(planningRequest);

        res.json({
            success: true,
            message: 'AI trip plan generated successfully',
            data: aiPlan
        });

    } catch (error) {
        logger.error('AI plan generation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate AI trip plan',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get quick travel recommendations
 */
const getQuickRecommendations = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentLocation, destination, preferences = {} } = req.body;

        // Merge with user preferences if available
        let finalPreferences = preferences;
        if (req.user && req.user.preferences) {
            finalPreferences = { ...req.user.preferences, ...preferences };
        }

        const recommendations = await aiPlannerService.generateQuickRecommendations(
            currentLocation,
            destination,
            finalPreferences
        );

        res.json({
            success: true,
            message: 'Quick recommendations generated successfully',
            data: recommendations
        });

    } catch (error) {
        logger.error('Quick recommendations error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate quick recommendations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Create manual trip plan
 */
const createManualPlan = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            title,
            description = '',
            origin,
            destination,
            waypoints = [],
            preferences = {},
            scheduledStartTime
        } = req.body;

        // Get route for the manual plan
        const routeResult = await mapplsService.getRoute(origin, destination, waypoints);

        if (!routeResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Unable to calculate route for the given locations'
            });
        }

        // Create trip plan
        const tripData = {
            userId: req.userId,
            title,
            description,
            type: 'manual_planned',
            origin: {
                name: origin.name || 'Origin',
                address: origin.address || '',
                latitude: origin.latitude,
                longitude: origin.longitude,
                placeId: origin.placeId
            },
            destination: {
                name: destination.name || 'Destination',
                address: destination.address || '',
                latitude: destination.latitude,
                longitude: destination.longitude,
                placeId: destination.placeId
            },
            waypoints: waypoints.map((wp, index) => ({
                name: wp.name || `Waypoint ${index + 1}`,
                address: wp.address || '',
                latitude: wp.latitude,
                longitude: wp.longitude,
                placeId: wp.placeId,
                estimatedDuration: wp.estimatedDuration || 30
            })),
            routes: [{
                type: 'fastest',
                totalDistance: routeResult.data.routes[0].distance,
                totalDuration: routeResult.data.routes[0].duration,
                polylineEncoded: routeResult.data.routes[0].geometry,
                isSelected: true,
                insights: routeResult.data.routes[0].insights
            }],
            planningPreferences: {
                transportMode: preferences.transportMode || 'driving',
                avoidTolls: preferences.avoidTolls || false,
                avoidHighways: preferences.avoidHighways || false,
                preferScenicRoutes: preferences.preferScenicRoutes || false
            }
        };

        if (scheduledStartTime) {
            tripData.scheduledStartTime = new Date(scheduledStartTime);
        }

        const trip = new Trip(tripData);
        await trip.save();

        logger.info(`Manual trip plan created: ${trip._id} by user ${req.userId}`);

        res.status(201).json({
            success: true,
            message: 'Manual trip plan created successfully',
            data: {
                trip,
                routeData: routeResult.data
            }
        });

    } catch (error) {
        logger.error('Manual plan creation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create manual trip plan',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Optimize route waypoint order
 */
const optimizeRoute = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { waypoints } = req.body;

        if (waypoints.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'At least 2 waypoints are required for optimization'
            });
        }

        // Simple optimization using distance matrix
        const optimizedOrder = await optimizeWaypointOrder(waypoints);

        // Calculate route for optimized order
        const origin = waypoints[0];
        const destination = waypoints[waypoints.length - 1];
        const intermediateWaypoints = optimizedOrder.slice(1, -1);

        const routeResult = await mapplsService.getRoute(origin, destination, intermediateWaypoints);

        res.json({
            success: true,
            message: 'Route optimized successfully',
            data: {
                originalOrder: waypoints,
                optimizedOrder,
                route: routeResult.success ? routeResult.data : null,
                optimization: {
                    distanceSaved: calculateDistanceSaved(waypoints, optimizedOrder),
                    timeSaved: calculateTimeSaved(waypoints, optimizedOrder)
                }
            }
        });

    } catch (error) {
        logger.error('Route optimization error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to optimize route',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Search for places
 */
const searchPlaces = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { query, latitude, longitude, radius = 5000 } = req.query;

        let location = null;
        if (latitude && longitude) {
            location = {
                lat: parseFloat(latitude),
                lng: parseFloat(longitude)
            };
        }

        const searchResult = await mapplsService.searchPlaces(query, location, parseInt(radius));

        if (!searchResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Search failed',
                error: searchResult.error
            });
        }

        res.json({
            success: true,
            message: 'Places search completed successfully',
            data: searchResult.data
        });

    } catch (error) {
        logger.error('Places search error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to search places',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get nearby places
 */
const getNearbyPlaces = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { latitude, longitude, radius = 2000, category = '' } = req.query;

        const nearbyResult = await mapplsService.getNearbyPlaces(
            parseFloat(latitude),
            parseFloat(longitude),
            parseInt(radius),
            category
        );

        if (!nearbyResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch nearby places',
                error: nearbyResult.error
            });
        }

        res.json({
            success: true,
            message: 'Nearby places retrieved successfully',
            data: nearbyResult.data
        });

    } catch (error) {
        logger.error('Nearby places error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get nearby places',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get place details
 */
const getPlaceDetails = async (req, res) => {
    try {
        const { placeId } = req.params;

        const placeDetails = await mapplsService.getPlaceDetails(placeId);

        if (!placeDetails.success) {
            return res.status(404).json({
                success: false,
                message: 'Place not found',
                error: placeDetails.error
            });
        }

        res.json({
            success: true,
            message: 'Place details retrieved successfully',
            data: placeDetails.data
        });

    } catch (error) {
        logger.error('Place details error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get place details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get route alternatives
 */
const getRouteAlternatives = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { origin, destination, criteria = ['fastest', 'shortest', 'economic'] } = req.body;

        const alternatives = await mapplsService.getRouteAlternatives(origin, destination, criteria);

        if (!alternatives.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to generate route alternatives',
                error: alternatives.error
            });
        }

        res.json({
            success: true,
            message: 'Route alternatives generated successfully',
            data: alternatives
        });

    } catch (error) {
        logger.error('Route alternatives error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get route alternatives',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Save generated plan as trip
 */
const savePlan = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { planData, title, description = '', scheduledStartTime } = req.body;

        // Extract plan information
        const plan = planData.plan || planData;
        
        if (!plan.route || !plan.route.routes || plan.route.routes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan data - route information is missing'
            });
        }

        const route = plan.route.routes[0];
        const waypoints = plan.optimizedWaypoints || [];

        // Create trip from AI plan
        const tripData = {
            userId: req.userId,
            title,
            description,
            type: planData.plan ? 'ai_planned' : 'manual_planned',
            origin: {
                name: route.waypoints?.origin?.name || 'Origin',
                address: route.waypoints?.origin?.formatted_address || '',
                latitude: route.waypoints?.origin?.lat || plan.origin?.latitude,
                longitude: route.waypoints?.origin?.lng || plan.origin?.longitude
            },
            destination: {
                name: route.waypoints?.destination?.name || 'Destination',
                address: route.waypoints?.destination?.formatted_address || '',
                latitude: route.waypoints?.destination?.lat || plan.destination?.latitude,
                longitude: route.waypoints?.destination?.lng || plan.destination?.longitude
            },
            waypoints: waypoints.map(wp => ({
                name: wp.name,
                address: wp.address,
                latitude: wp.latitude,
                longitude: wp.longitude,
                placeId: wp.placeId,
                estimatedDuration: wp.estimatedDuration || 30,
                rewardPoints: wp.rewardPoints || 10
            })),
            routes: [{
                type: 'fastest',
                totalDistance: route.distance,
                totalDuration: route.duration,
                polylineEncoded: route.geometry,
                isSelected: true,
                insights: route.insights
            }],
            planningPreferences: {
                transportMode: planData.travelMode || 'driving'
            }
        };

        // Add AI planning data if it's an AI-generated plan
        if (planData.plan) {
            tripData.aiPlanningData = {
                prompt: `AI-generated plan with ${waypoints.length} waypoints`,
                generatedAt: new Date(),
                confidence: planData.confidence || 85,
                alternativesConsidered: planData.metadata?.alternativesConsidered || 1,
                reasoningLog: planData.reasoningLog || [],
                contextFactors: planData.metadata?.contextFactors || {}
            };
        }

        if (scheduledStartTime) {
            tripData.scheduledStartTime = new Date(scheduledStartTime);
        }

        const trip = new Trip(tripData);
        await trip.save();

        logger.info(`Trip plan saved: ${trip._id} by user ${req.userId}`);

        res.status(201).json({
            success: true,
            message: 'Trip plan saved successfully',
            data: {
                tripId: trip._id,
                trip
            }
        });

    } catch (error) {
        logger.error('Save plan error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to save trip plan',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get popular destinations
 */
const getPopularDestinations = async (req, res) => {
    try {
        const { latitude, longitude, radius = 50000, limit = 10 } = req.query;

        let searchLocation = null;
        
        // Use provided location or user's default location
        if (latitude && longitude) {
            searchLocation = {
                lat: parseFloat(latitude),
                lng: parseFloat(longitude)
            };
        } else if (req.user && req.user.defaultLocation) {
            searchLocation = {
                lat: req.user.defaultLocation.latitude,
                lng: req.user.defaultLocation.longitude
            };
        }

        if (!searchLocation) {
            return res.status(400).json({
                success: false,
                message: 'Location is required. Please provide latitude and longitude or set default location.'
            });
        }

        // Get popular categories
        const popularCategories = ['tourist_attraction', 'restaurant', 'shopping_mall', 'park', 'museum'];
        const destinations = [];

        for (const category of popularCategories) {
            try {
                const places = await mapplsService.getNearbyPlaces(
                    searchLocation.lat,
                    searchLocation.lng,
                    parseInt(radius),
                    category,
                    category
                );

                if (places.success && places.data.results) {
                    // Take top 2 from each category
                    const topPlaces = places.data.results
                        .slice(0, 2)
                        .map(place => ({
                            ...place,
                            category,
                            popularity: calculatePopularityScore(place)
                        }));
                    
                    destinations.push(...topPlaces);
                }
            } catch (error) {
                logger.warn(`Error fetching ${category} places:`, error.message);
            }
        }

        // Sort by popularity and limit results
        destinations.sort((a, b) => b.popularity - a.popularity);
        const topDestinations = destinations.slice(0, parseInt(limit));

        res.json({
            success: true,
            message: 'Popular destinations retrieved successfully',
            data: {
                destinations: topDestinations,
                searchLocation,
                metadata: {
                    searchRadius: parseInt(radius),
                    categoriesSearched: popularCategories.length,
                    totalFound: destinations.length
                }
            }
        });

    } catch (error) {
        logger.error('Popular destinations error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get popular destinations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get travel insights
 */
const getTravelInsights = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { origin, destination, departureTime } = req.body;

        // Get basic route
        const routeResult = await mapplsService.getRoute(origin, destination);

        if (!routeResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Unable to calculate route'
            });
        }

        const route = routeResult.data.routes[0];
        
        // Generate insights
        const insights = {
            route: {
                distance: route.distance,
                duration: route.duration,
                insights: route.insights
            },
            traffic: {
                currentLevel: 'medium', // Would be fetched from real traffic API
                prediction: generateTrafficPrediction(departureTime),
                recommendation: getTrafficRecommendation(departureTime)
            },
            weather: {
                recommendation: 'Check weather conditions before departure',
                visibility: 'good',
                roadConditions: 'normal'
            },
            cost: {
                fuel: route.insights?.fuelCost || 0,
                tolls: route.insights?.tollCost || 0,
                total: (route.insights?.fuelCost || 0) + (route.insights?.tollCost || 0)
            },
            safety: {
                riskLevel: 'low',
                recommendations: [
                    'Share your trip with family/friends',
                    'Keep emergency contacts handy',
                    'Check vehicle condition before departure'
                ]
            },
            alternatives: {
                timeOptimized: departureTime ? getOptimalDepartureTime(departureTime) : null,
                costOptimized: 'Consider toll-free route to save money',
                comfortOptimized: 'Add rest stops for comfortable journey'
            }
        };

        res.json({
            success: true,
            message: 'Travel insights generated successfully',
            data: insights
        });

    } catch (error) {
        logger.error('Travel insights error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate travel insights',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Validate waypoints
 */
const validateWaypoints = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { waypoints } = req.body;
        const validatedWaypoints = [];
        const issues = [];

        for (let i = 0; i < waypoints.length; i++) {
            const waypoint = waypoints[i];
            
            try {
                // Validate coordinates
                if (!waypoint.latitude || !waypoint.longitude) {
                    issues.push({
                        waypointIndex: i,
                        issue: 'Missing coordinates',
                        severity: 'error'
                    });
                    continue;
                }

                // Reverse geocode to validate location
                const reverseGeocode = await mapplsService.reverseGeocode(
                    waypoint.latitude,
                    waypoint.longitude
                );

                if (reverseGeocode.success) {
                    validatedWaypoints.push({
                        ...waypoint,
                        validated: true,
                        address: reverseGeocode.data.formatted_address || waypoint.address,
                        validationData: reverseGeocode.data
                    });
                } else {
                    issues.push({
                        waypointIndex: i,
                        issue: 'Invalid coordinates or location not found',
                        severity: 'warning'
                    });
                    
                    validatedWaypoints.push({
                        ...waypoint,
                        validated: false
                    });
                }

            } catch (error) {
                issues.push({
                    waypointIndex: i,
                    issue: `Validation error: ${error.message}`,
                    severity: 'error'
                });
                
                validatedWaypoints.push({
                    ...waypoint,
                    validated: false
                });
            }
        }

        res.json({
            success: true,
            message: 'Waypoints validated successfully',
            data: {
                validatedWaypoints,
                issues,
                summary: {
                    total: waypoints.length,
                    valid: validatedWaypoints.filter(wp => wp.validated).length,
                    invalid: validatedWaypoints.filter(wp => !wp.validated).length,
                    hasErrors: issues.some(issue => issue.severity === 'error')
                }
            }
        });

    } catch (error) {
        logger.error('Waypoint validation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to validate waypoints',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper functions

/**
 * Optimize waypoint order using simple nearest neighbor algorithm
 */
async function optimizeWaypointOrder(waypoints) {
    if (waypoints.length <= 2) return waypoints;

    const optimized = [waypoints[0]]; // Start with first waypoint
    const remaining = waypoints.slice(1, -1); // Exclude first and last
    let currentLocation = waypoints[0];

    while (remaining.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        remaining.forEach((waypoint, index) => {
            const distance = geolib.getDistance(
                { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                { latitude: waypoint.latitude, longitude: waypoint.longitude }
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        const nearestWaypoint = remaining.splice(nearestIndex, 1)[0];
        optimized.push(nearestWaypoint);
        currentLocation = nearestWaypoint;
    }

    optimized.push(waypoints[waypoints.length - 1]); // Add last waypoint
    return optimized;
}

/**
 * Calculate distance saved by optimization
 */
function calculateDistanceSaved(original, optimized) {
    const originalDistance = calculateTotalDistance(original);
    const optimizedDistance = calculateTotalDistance(optimized);
    
    return Math.max(0, originalDistance - optimizedDistance);
}

/**
 * Calculate time saved by optimization
 */
function calculateTimeSaved(original, optimized) {
    const distanceSaved = calculateDistanceSaved(original, optimized);
    const avgSpeed = 50; // km/h average speed
    
    return Math.round((distanceSaved / 1000) / avgSpeed * 60); // minutes saved
}

/**
 * Calculate total distance for waypoints
 */
function calculateTotalDistance(waypoints) {
    let totalDistance = 0;
    
    for (let i = 1; i < waypoints.length; i++) {
        const distance = geolib.getDistance(
            { latitude: waypoints[i-1].latitude, longitude: waypoints[i-1].longitude },
            { latitude: waypoints[i].latitude, longitude: waypoints[i].longitude }
        );
        totalDistance += distance;
    }
    
    return totalDistance;
}

/**
 * Calculate popularity score for a place
 */
function calculatePopularityScore(place) {
    let score = 0;
    
    if (place.rating) {
        score += place.rating * 20;
    }
    
    if (place.user_ratings_total) {
        score += Math.min(place.user_ratings_total / 10, 50);
    }
    
    // Category bonus
    const categoryBonus = {
        'tourist_attraction': 30,
        'restaurant': 20,
        'shopping_mall': 15,
        'park': 25,
        'museum': 20
    };
    
    if (place.types) {
        for (const type of place.types) {
            if (categoryBonus[type]) {
                score += categoryBonus[type];
                break;
            }
        }
    }
    
    return score;
}

/**
 * Generate traffic prediction
 */
function generateTrafficPrediction(departureTime) {
    if (!departureTime) return 'Normal traffic expected';
    
    const depTime = new Date(departureTime);
    const hour = depTime.getHours();
    
    if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
        return 'Heavy traffic expected during rush hours';
    }
    
    if (hour >= 22 || hour <= 5) {
        return 'Light traffic expected during late hours';
    }
    
    return 'Moderate traffic expected';
}

/**
 * Get traffic recommendation
 */
function getTrafficRecommendation(departureTime) {
    if (!departureTime) return 'Consider current traffic conditions';
    
    const depTime = new Date(departureTime);
    const hour = depTime.getHours();
    
    if ((hour >= 7 && hour <= 10)) {
        return 'Consider departing after 10:30 AM to avoid morning rush';
    }
    
    if (hour >= 17 && hour <= 20) {
        return 'Consider departing after 8:30 PM to avoid evening rush';
    }
    
    return 'Good time to travel';
}

/**
 * Get optimal departure time
 */
function getOptimalDepartureTime(requestedTime) {
    const requested = new Date(requestedTime);
    const hour = requested.getHours();
    
    if ((hour >= 7 && hour <= 10)) {
        const optimal = new Date(requested);
        optimal.setHours(10, 30, 0, 0);
        return {
            recommended: optimal.toISOString(),
            reason: 'Avoid morning rush hour',
            timeSaving: '20-30 minutes'
        };
    }
    
    if (hour >= 17 && hour <= 20) {
        const optimal = new Date(requested);
        optimal.setHours(20, 30, 0, 0);
        return {
            recommended: optimal.toISOString(),
            reason: 'Avoid evening rush hour',
            timeSaving: '15-25 minutes'
        };
    }
    
    return {
        recommended: requestedTime,
        reason: 'Optimal time for travel',
        timeSaving: '0 minutes'
    };
}

/**
 * Get autosuggest recommendations
 */
const getAutosuggest = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { query, location, region = 'IND' } = req.query;

        let locationObj = null;
        if (location) {
            const [lat, lng] = location.split(',').map(parseFloat);
            if (!isNaN(lat) && !isNaN(lng)) {
                locationObj = { lat, lng };
            }
        }

        const autosuggestResult = await mapplsService.autosuggest(query, locationObj, region);

        if (!autosuggestResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Autosuggest failed',
                error: autosuggestResult.error
            });
        }

        res.json({
            success: true,
            message: 'Autosuggest results retrieved successfully',
            data: autosuggestResult.data
        });

    } catch (error) {
        logger.error('Autosuggest error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get autosuggest results',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get walking route
 */
const getWalkingRoute = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { origin, destination, waypoints = [] } = req.body;

        const walkingRouteResult = await mapplsService.getWalkingRoute(origin, destination, waypoints);

        if (!walkingRouteResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to calculate walking route',
                error: walkingRouteResult.error
            });
        }

        res.json({
            success: true,
            message: 'Walking route calculated successfully',
            data: walkingRouteResult.data
        });

    } catch (error) {
        logger.error('Walking route error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate walking route',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    generateAIPlan,
    getQuickRecommendations,
    createManualPlan,
    optimizeRoute,
    searchPlaces,
    getNearbyPlaces,
    getPlaceDetails,
    getRouteAlternatives,
    savePlan,
    getPopularDestinations,
    getTravelInsights,
    validateWaypoints,
    getAutosuggest,
    getWalkingRoute
};
