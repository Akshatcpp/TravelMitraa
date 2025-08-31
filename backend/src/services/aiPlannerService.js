const mapplsService = require('./mapplsService');
const logger = require('../utils/logger');
const geolib = require('geolib');
const moment = require('moment');

class AIPlannerService {
    constructor() {
        this.mapplsService = mapplsService;
        this.reasoningLog = [];
    }

    /**
     * Generate intelligent trip plan based on user preferences and real-time data
     */
    async generateTripPlan(planningRequest) {
        try {
            this.reasoningLog = [];
            this._log('Starting AI trip planning process');

            const {
                origin,
                destination,
                userPreferences,
                timeConstraints,
                budget,
                interests,
                travelMode = 'driving',
                groupSize = 1
            } = planningRequest;

            // Step 1: Analyze the trip context
            const tripContext = await this._analyzeTripContext(origin, destination, timeConstraints);
            this._log(`Trip context analyzed: ${tripContext.duration} hours, ${tripContext.distance} km`);

            // Step 2: Get route alternatives
            const routeAlternatives = await this._getIntelligentRoutes(origin, destination, userPreferences, travelMode);
            this._log(`Generated ${routeAlternatives.length} route alternatives`);

            // Step 3: Find interesting POIs along routes
            const enhancedRoutes = await this._enhanceRoutesWithPOIs(routeAlternatives, interests, budget);
            this._log('Enhanced routes with relevant POIs');

            // Step 4: Optimize waypoint order
            const optimizedPlan = await this._optimizeWaypointOrder(enhancedRoutes, timeConstraints);
            this._log('Optimized waypoint order for efficiency');

            // Step 5: Add contextual recommendations
            const finalPlan = await this._addContextualRecommendations(optimizedPlan, tripContext, userPreferences);
            this._log('Added contextual recommendations');

            // Step 6: Calculate confidence score
            const confidence = this._calculatePlanConfidence(finalPlan, tripContext);

            return {
                success: true,
                plan: finalPlan,
                confidence,
                reasoningLog: this.reasoningLog,
                metadata: {
                    generatedAt: new Date(),
                    planningDuration: Date.now() - this.startTime,
                    alternativesConsidered: routeAlternatives.length,
                    contextFactors: tripContext
                }
            };

        } catch (error) {
            logger.error('AI trip planning error:', error.message);
            throw new Error('Failed to generate trip plan: ' + error.message);
        }
    }

    /**
     * Analyze trip context and constraints
     */
    async _analyzeTripContext(origin, destination, timeConstraints) {
        this.startTime = Date.now();
        
        // Get basic route information
        const basicRoute = await this.mapplsService.getRoute(origin, destination);
        
        if (!basicRoute.success) {
            throw new Error('Unable to calculate basic route');
        }

        const route = basicRoute.data.routes[0];
        const distance = route.distance / 1000; // Convert to km
        const duration = route.duration / 3600; // Convert to hours

        // Analyze time constraints
        const now = new Date();
        const availableTime = timeConstraints?.maxDuration || 24; // Default 24 hours
        const departureTime = timeConstraints?.departureTime ? new Date(timeConstraints.departureTime) : now;
        
        // Get current traffic conditions
        const trafficInfo = await this._analyzeTrafficConditions(route);
        
        // Determine trip characteristics
        const tripType = this._determineTripType(distance, duration, availableTime);
        
        return {
            distance,
            duration,
            availableTime,
            departureTime,
            traffic: trafficInfo,
            tripType,
            complexity: this._calculateTripComplexity(distance, duration, trafficInfo),
            recommendations: this._getTimeBasedRecommendations(departureTime, duration)
        };
    }

    /**
     * Generate intelligent route alternatives
     */
    async _getIntelligentRoutes(origin, destination, userPreferences, travelMode) {
        const routeCriteria = ['fastest', 'shortest'];
        
        // Add economic route if user prefers to avoid tolls
        if (userPreferences?.avoidTolls) {
            routeCriteria.push('economic');
        }
        
        // Add scenic route if user prefers scenic routes
        if (userPreferences?.preferScenicRoutes) {
            routeCriteria.push('scenic');
        }

        const routeAlternatives = await this.mapplsService.getRouteAlternatives(
            origin, 
            destination, 
            routeCriteria
        );

        if (!routeAlternatives.success) {
            throw new Error('Unable to generate route alternatives');
        }

        return routeAlternatives.alternatives;
    }

    /**
     * Enhance routes with relevant POIs
     */
    async _enhanceRoutesWithPOIs(routes, interests, budget) {
        const enhancedRoutes = [];

        for (const route of routes) {
            try {
                const routeGeometry = route.route.routes[0].geometry;
                
                // Find POIs along the route based on interests
                const poisAlongRoute = await this._findRelevantPOIs(routeGeometry, interests, budget);
                
                // Select optimal POIs based on AI criteria
                const selectedPOIs = this._selectOptimalPOIs(poisAlongRoute, route, budget);
                
                enhancedRoutes.push({
                    ...route,
                    suggestedPOIs: selectedPOIs,
                    poiScore: this._calculatePOIScore(selectedPOIs),
                    estimatedAdditionalTime: this._calculateAdditionalTime(selectedPOIs)
                });

            } catch (error) {
                logger.warn('Error enhancing route with POIs:', error.message);
                enhancedRoutes.push(route);
            }
        }

        return enhancedRoutes;
    }

    /**
     * Find relevant POIs based on interests
     */
    async _findRelevantPOIs(routeGeometry, interests = [], budget = 'medium') {
        const poisByCategory = {};
        
        // Define interest categories mapping
        const categoryMapping = {
            'food': ['restaurant', 'cafe', 'food'],
            'tourism': ['tourist_attraction', 'museum', 'park'],
            'shopping': ['shopping_mall', 'store'],
            'fuel': ['gas_station', 'petrol_pump'],
            'accommodation': ['lodging', 'hotel'],
            'entertainment': ['amusement_park', 'movie_theater'],
            'religious': ['place_of_worship', 'temple', 'mosque', 'church'],
            'medical': ['hospital', 'pharmacy'],
            'banking': ['bank', 'atm']
        };

        // Always include essential services
        const essentialCategories = ['fuel', 'medical'];
        const searchCategories = [...essentialCategories, ...interests];

        for (const interest of searchCategories) {
            const categories = categoryMapping[interest] || [interest];
            
            for (const category of categories) {
                try {
                    const pois = await this.mapplsService.getPOIsAlongRoute(
                        { geometry: routeGeometry },
                        category,
                        2000 // 2km buffer
                    );
                    
                    if (pois.success && pois.data.results) {
                        poisByCategory[category] = pois.data.results;
                    }
                } catch (error) {
                    logger.warn(`Error fetching POIs for category ${category}:`, error.message);
                }
            }
        }

        return poisByCategory;
    }

    /**
     * Select optimal POIs using AI criteria
     */
    _selectOptimalPOIs(poisByCategory, route, budget) {
        const selectedPOIs = [];
        const maxPOIs = this._getMaxPOIsByBudget(budget);
        
        // Prioritize POIs based on rating, relevance, and user preferences
        const allPOIs = [];
        
        for (const [category, pois] of Object.entries(poisByCategory)) {
            pois.forEach(poi => {
                const score = this._calculatePOIRelevanceScore(poi, category, budget);
                allPOIs.push({
                    ...poi,
                    category,
                    relevanceScore: score
                });
            });
        }

        // Sort by relevance score and select top POIs
        allPOIs.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        // Select diverse POIs (avoid too many from same category)
        const categoryCount = {};
        const maxPerCategory = Math.ceil(maxPOIs / Object.keys(poisByCategory).length);

        for (const poi of allPOIs) {
            if (selectedPOIs.length >= maxPOIs) break;
            
            const categoryLimit = poi.category === 'fuel' ? 2 : maxPerCategory;
            
            if ((categoryCount[poi.category] || 0) < categoryLimit) {
                selectedPOIs.push(poi);
                categoryCount[poi.category] = (categoryCount[poi.category] || 0) + 1;
            }
        }

        return selectedPOIs;
    }

    /**
     * Calculate POI relevance score
     */
    _calculatePOIRelevanceScore(poi, category, budget) {
        let score = 0;

        // Base score from rating
        if (poi.rating) {
            score += poi.rating * 20;
        }

        // Popularity bonus
        if (poi.user_ratings_total > 100) score += 10;
        if (poi.user_ratings_total > 500) score += 15;

        // Category importance
        const categoryScores = {
            'fuel': 25,
            'restaurant': 20,
            'tourist_attraction': 30,
            'medical': 15,
            'shopping_mall': 15,
            'park': 18
        };
        score += categoryScores[category] || 10;

        // Budget considerations
        if (budget === 'low' && poi.price_level > 2) score -= 20;
        if (budget === 'high' && poi.price_level >= 3) score += 10;

        // Essential services bonus
        if (['fuel', 'medical', 'bank'].includes(category)) {
            score += 15;
        }

        return Math.max(score, 0);
    }

    /**
     * Optimize waypoint order for efficiency
     */
    async _optimizeWaypointOrder(enhancedRoutes, timeConstraints) {
        // Select the best route based on multiple criteria
        const bestRoute = this._selectBestRoute(enhancedRoutes);
        
        if (!bestRoute.suggestedPOIs || bestRoute.suggestedPOIs.length === 0) {
            return bestRoute;
        }

        // Optimize POI order using traveling salesman optimization
        const optimizedOrder = this._optimizePOIOrder(bestRoute.suggestedPOIs, bestRoute.route);
        
        // Create optimized waypoints
        const optimizedWaypoints = optimizedOrder.map((poi, index) => ({
            name: poi.name,
            address: poi.formatted_address || poi.vicinity,
            latitude: poi.geometry.location.lat,
            longitude: poi.geometry.location.lng,
            placeId: poi.place_id,
            category: poi.category,
            estimatedDuration: this._estimateVisitDuration(poi),
            rewardPoints: poi.rewardPoints || 10,
            relevanceScore: poi.relevanceScore,
            order: index + 1,
            reasoning: this._getWaypointReasoning(poi)
        }));

        return {
            ...bestRoute,
            optimizedWaypoints,
            planningInsights: {
                routeEfficiency: this._calculateRouteEfficiency(optimizedWaypoints),
                timeOptimization: this._calculateTimeOptimization(optimizedWaypoints),
                costOptimization: this._calculateCostOptimization(bestRoute.route)
            }
        };
    }

    /**
     * Select best route from alternatives
     */
    _selectBestRoute(routes) {
        let bestRoute = routes[0];
        let bestScore = 0;

        for (const route of routes) {
            const score = this._calculateRouteScore(route);
            if (score > bestScore) {
                bestScore = score;
                bestRoute = route;
            }
        }

        this._log(`Selected ${bestRoute.type} route with score ${bestScore}`);
        return bestRoute;
    }

    /**
     * Calculate route score for selection
     */
    _calculateRouteScore(route) {
        let score = 0;
        
        const routeData = route.route.routes[0];
        const duration = routeData.duration / 3600; // hours
        const distance = routeData.distance / 1000; // km
        
        // Time efficiency (shorter is better)
        score += Math.max(0, 50 - duration * 5);
        
        // POI quality
        if (route.suggestedPOIs) {
            const avgPOIScore = route.suggestedPOIs.reduce((sum, poi) => sum + poi.relevanceScore, 0) / route.suggestedPOIs.length;
            score += avgPOIScore * 0.5;
        }
        
        // Route type bonus
        const typeBonus = {
            'fastest': 20,
            'shortest': 15,
            'economic': 25,
            'scenic': 30
        };
        score += typeBonus[route.type] || 10;
        
        return score;
    }

    /**
     * Optimize POI order using simple traveling salesman approach
     */
    _optimizePOIOrder(pois, route) {
        if (pois.length <= 2) return pois;

        // Simple nearest neighbor optimization
        const optimized = [];
        const remaining = [...pois];
        
        // Start with the POI closest to origin
        const routeStart = route.routes[0].legs[0].start_location;
        let currentLocation = {
            lat: routeStart.lat,
            lng: routeStart.lng
        };

        while (remaining.length > 0) {
            let nearestIndex = 0;
            let nearestDistance = Infinity;

            remaining.forEach((poi, index) => {
                const distance = geolib.getDistance(
                    currentLocation,
                    {
                        latitude: poi.geometry.location.lat,
                        longitude: poi.geometry.location.lng
                    }
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });

            const nearestPOI = remaining.splice(nearestIndex, 1)[0];
            optimized.push(nearestPOI);
            
            currentLocation = {
                lat: nearestPOI.geometry.location.lat,
                lng: nearestPOI.geometry.location.lng
            };
        }

        return optimized;
    }

    /**
     * Add contextual recommendations based on time, weather, and traffic
     */
    async _addContextualRecommendations(plan, tripContext, userPreferences) {
        const recommendations = [];
        
        // Traffic-based recommendations
        if (tripContext.traffic.level === 'high') {
            recommendations.push({
                type: 'traffic',
                priority: 'high',
                message: 'Heavy traffic detected. Consider starting 30 minutes earlier.',
                action: 'adjust_departure_time',
                impact: 'time_saving'
            });
        }

        // Time-based recommendations
        const departureHour = tripContext.departureTime.getHours();
        if (departureHour >= 12 && departureHour <= 14) {
            recommendations.push({
                type: 'timing',
                priority: 'medium',
                message: 'Lunch time travel - restaurants along route will be busy.',
                action: 'book_restaurant',
                impact: 'convenience'
            });
        }

        // Weather considerations (placeholder for weather API integration)
        recommendations.push({
            type: 'weather',
            priority: 'low',
            message: 'Check weather conditions before departure.',
            action: 'check_weather',
            impact: 'safety'
        });

        // Fuel/charging recommendations
        if (plan.optimizedWaypoints) {
            const fuelStops = plan.optimizedWaypoints.filter(wp => wp.category === 'fuel');
            if (fuelStops.length === 0 && tripContext.distance > 200) {
                recommendations.push({
                    type: 'fuel',
                    priority: 'high',
                    message: 'Long trip detected. Consider adding fuel stops.',
                    action: 'add_fuel_stop',
                    impact: 'safety'
                });
            }
        }

        // Budget optimization
        const budgetRecommendations = this._getBudgetOptimizations(plan, tripContext);
        recommendations.push(...budgetRecommendations);

        return {
            ...plan,
            contextualRecommendations: recommendations,
            aiInsights: {
                tripCharacteristics: this._describeTripCharacteristics(tripContext),
                optimizationOpportunities: this._identifyOptimizationOpportunities(plan, tripContext),
                riskFactors: this._identifyRiskFactors(tripContext),
                alternativeOptions: this._suggestAlternatives(plan, tripContext)
            }
        };
    }

    /**
     * Analyze traffic conditions
     */
    async _analyzeTrafficConditions(route) {
        try {
            // Get traffic info for route
            const trafficData = await this.mapplsService.getRealTimeTraffic(route.geometry);
            
            if (trafficData.success) {
                return {
                    level: trafficData.data.trafficLevel || 'medium',
                    incidents: trafficData.data.incidents || [],
                    recommendation: trafficData.data.recommendation || 'Normal traffic conditions'
                };
            }
        } catch (error) {
            logger.warn('Unable to fetch traffic data:', error.message);
        }

        // Fallback to time-based traffic estimation
        const hour = new Date().getHours();
        const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
        
        return {
            level: isRushHour ? 'high' : 'medium',
            incidents: [],
            recommendation: isRushHour ? 'Heavy traffic expected during rush hours' : 'Normal traffic conditions',
            estimated: true
        };
    }

    /**
     * Determine trip type based on characteristics
     */
    _determineTripType(distance, duration, availableTime) {
        if (duration <= 1) return 'short';
        if (duration <= 4) return 'medium';
        if (duration <= 8) return 'long';
        return 'extended';
    }

    /**
     * Calculate trip complexity
     */
    _calculateTripComplexity(distance, duration, traffic) {
        let complexity = 1;
        
        if (distance > 100) complexity += 1;
        if (distance > 300) complexity += 1;
        if (duration > 4) complexity += 1;
        if (traffic.level === 'high') complexity += 1;
        
        return Math.min(complexity, 5);
    }

    /**
     * Get time-based recommendations
     */
    _getTimeBasedRecommendations(departureTime, duration) {
        const recommendations = [];
        const hour = departureTime.getHours();
        
        if (hour < 6) {
            recommendations.push('Early morning travel - roads will be clear');
        } else if (hour >= 7 && hour <= 9) {
            recommendations.push('Morning rush hour - expect delays');
        } else if (hour >= 17 && hour <= 19) {
            recommendations.push('Evening rush hour - plan for extra time');
        }
        
        if (duration > 4) {
            recommendations.push('Long journey - plan rest stops every 2 hours');
        }
        
        return recommendations;
    }

    /**
     * Calculate planning confidence
     */
    _calculatePlanConfidence(plan, context) {
        let confidence = 70; // Base confidence
        
        // Boost confidence for shorter, simpler trips
        if (context.duration <= 2) confidence += 15;
        if (context.complexity <= 2) confidence += 10;
        
        // Reduce confidence for complex conditions
        if (context.traffic.level === 'high') confidence -= 10;
        if (context.distance > 500) confidence -= 5;
        
        // Boost confidence if we have good POI data
        if (plan.optimizedWaypoints && plan.optimizedWaypoints.length > 0) {
            const avgRelevance = plan.optimizedWaypoints.reduce((sum, wp) => sum + wp.relevanceScore, 0) / plan.optimizedWaypoints.length;
            confidence += Math.min(avgRelevance / 10, 15);
        }
        
        return Math.max(Math.min(confidence, 95), 30);
    }

    /**
     * Get maximum POIs based on budget
     */
    _getMaxPOIsByBudget(budget) {
        const limits = {
            'low': 3,
            'medium': 5,
            'high': 8
        };
        return limits[budget] || 5;
    }

    /**
     * Estimate visit duration for POI
     */
    _estimateVisitDuration(poi) {
        const categoryDurations = {
            'restaurant': 60,
            'tourist_attraction': 90,
            'museum': 120,
            'park': 45,
            'shopping_mall': 90,
            'fuel': 10,
            'medical': 30,
            'bank': 15
        };

        const poiTypes = poi.types || [];
        for (const type of poiTypes) {
            if (categoryDurations[type]) {
                return categoryDurations[type];
            }
        }

        return 30; // Default 30 minutes
    }

    /**
     * Calculate POI score for route enhancement
     */
    _calculatePOIScore(pois) {
        if (!pois || pois.length === 0) return 0;
        
        const avgRelevance = pois.reduce((sum, poi) => sum + poi.relevanceScore, 0) / pois.length;
        const diversityBonus = this._calculatePOIDiversity(pois);
        
        return Math.round(avgRelevance + diversityBonus);
    }

    /**
     * Calculate POI diversity bonus
     */
    _calculatePOIDiversity(pois) {
        const categories = new Set(pois.map(poi => poi.category));
        return categories.size * 5; // 5 points per unique category
    }

    /**
     * Calculate additional time for POIs
     */
    _calculateAdditionalTime(pois) {
        if (!pois || pois.length === 0) return 0;
        
        return pois.reduce((total, poi) => {
            const visitDuration = this._estimateVisitDuration(poi);
            const travelTime = 10; // Estimated 10 minutes travel time between POIs
            return total + visitDuration + travelTime;
        }, 0);
    }

    /**
     * Get budget optimizations
     */
    _getBudgetOptimizations(plan, context) {
        const recommendations = [];
        
        // Toll optimization
        if (context.distance > 100) {
            recommendations.push({
                type: 'budget',
                priority: 'medium',
                message: 'Consider toll-free route to save ₹200-500',
                action: 'switch_to_economic_route',
                impact: 'cost_saving'
            });
        }

        // Fuel optimization
        const estimatedFuelCost = Math.ceil((context.distance / 15) * 100);
        if (estimatedFuelCost > 500) {
            recommendations.push({
                type: 'budget',
                priority: 'low',
                message: `Estimated fuel cost: ₹${estimatedFuelCost}. Consider carpooling.`,
                action: 'suggest_carpooling',
                impact: 'cost_saving'
            });
        }

        return recommendations;
    }

    /**
     * Describe trip characteristics
     */
    _describeTripCharacteristics(context) {
        const characteristics = [];
        
        characteristics.push(`${context.tripType} trip`);
        characteristics.push(`${Math.round(context.distance)} km distance`);
        characteristics.push(`${Math.round(context.duration)} hours duration`);
        characteristics.push(`${context.traffic.level} traffic expected`);
        
        if (context.complexity >= 4) {
            characteristics.push('complex route with multiple considerations');
        }
        
        return characteristics.join(', ');
    }

    /**
     * Identify optimization opportunities
     */
    _identifyOptimizationOpportunities(plan, context) {
        const opportunities = [];
        
        if (context.traffic.level === 'high') {
            opportunities.push('Departure time adjustment could save 20-30 minutes');
        }
        
        if (plan.optimizedWaypoints && plan.optimizedWaypoints.length > 3) {
            opportunities.push('Route has multiple stops - consider splitting into 2 trips');
        }
        
        if (context.distance > 300) {
            opportunities.push('Long distance trip - overnight stay might be beneficial');
        }
        
        return opportunities;
    }

    /**
     * Identify risk factors
     */
    _identifyRiskFactors(context) {
        const risks = [];
        
        if (context.traffic.incidents && context.traffic.incidents.length > 0) {
            risks.push('Traffic incidents reported on route');
        }
        
        if (context.complexity >= 4) {
            risks.push('Complex route - higher chance of delays');
        }
        
        const departureHour = context.departureTime.getHours();
        if (departureHour < 5 || departureHour > 22) {
            risks.push('Late night/early morning travel - limited services available');
        }
        
        return risks;
    }

    /**
     * Suggest alternatives
     */
    _suggestAlternatives(plan, context) {
        const alternatives = [];
        
        if (context.duration > 6) {
            alternatives.push({
                type: 'timing',
                description: 'Split into multi-day trip with overnight stay',
                benefit: 'Reduced fatigue and better experience'
            });
        }
        
        if (plan.optimizedWaypoints && plan.optimizedWaypoints.length > 5) {
            alternatives.push({
                type: 'scope',
                description: 'Focus on top 3 destinations for this trip',
                benefit: 'More time at each location'
            });
        }
        
        return alternatives;
    }

    /**
     * Calculate route efficiency
     */
    _calculateRouteEfficiency(waypoints) {
        // Simple efficiency calculation based on waypoint distribution
        if (!waypoints || waypoints.length < 2) return 100;
        
        // Calculate if waypoints follow logical geographical order
        let efficiency = 100;
        
        for (let i = 1; i < waypoints.length; i++) {
            const prev = waypoints[i - 1];
            const curr = waypoints[i];
            
            const distance = geolib.getDistance(
                { latitude: prev.latitude, longitude: prev.longitude },
                { latitude: curr.latitude, longitude: curr.longitude }
            );
            
            // Penalize if waypoints are too far apart (suggesting backtracking)
            if (distance > 20000) { // 20km
                efficiency -= 10;
            }
        }
        
        return Math.max(efficiency, 60);
    }

    /**
     * Calculate time optimization score
     */
    _calculateTimeOptimization(waypoints) {
        if (!waypoints) return 100;
        
        const totalVisitTime = waypoints.reduce((sum, wp) => sum + (wp.estimatedDuration || 30), 0);
        
        // Optimal visit time should be balanced
        if (totalVisitTime < 60) return 70; // Too short
        if (totalVisitTime > 300) return 75; // Too long
        
        return 90; // Well balanced
    }

    /**
     * Calculate cost optimization score
     */
    _calculateCostOptimization(route) {
        const routeData = route.routes[0];
        const insights = routeData.insights;
        
        if (!insights) return 75;
        
        let score = 100;
        
        // Penalize high toll costs
        if (insights.tollCost > 300) score -= 15;
        if (insights.tollCost > 500) score -= 10;
        
        // Penalize high fuel costs
        if (insights.fuelCost > 800) score -= 10;
        if (insights.fuelCost > 1200) score -= 10;
        
        return Math.max(score, 60);
    }

    /**
     * Get waypoint reasoning
     */
    _getWaypointReasoning(poi) {
        const reasons = [];
        
        if (poi.rating >= 4.0) reasons.push('highly rated');
        if (poi.user_ratings_total > 500) reasons.push('popular destination');
        if (poi.category === 'tourist_attraction') reasons.push('tourist attraction');
        if (poi.category === 'fuel') reasons.push('essential service');
        
        return reasons.join(', ') || 'recommended stop';
    }

    /**
     * Log reasoning for transparency
     */
    _log(message) {
        this.reasoningLog.push({
            timestamp: new Date().toISOString(),
            message
        });
        logger.info(`[AI Planner] ${message}`);
    }

    /**
     * Generate quick recommendations for immediate travel
     */
    async generateQuickRecommendations(currentLocation, destination, preferences = {}) {
        try {
            this._log('Generating quick travel recommendations');

            // Get fast route
            const route = await this.mapplsService.getRoute(currentLocation, destination);
            
            if (!route.success) {
                throw new Error('Unable to calculate route');
            }

            // Get essential stops (fuel, food if needed)
            const essentialStops = await this._getEssentialStops(route.data.routes[0], preferences);
            
            // Get traffic-aware recommendations
            const trafficRecommendations = await this._getTrafficAwareRecommendations(route.data.routes[0]);

            return {
                success: true,
                quickRoute: route.data,
                essentialStops,
                trafficRecommendations,
                estimatedCosts: {
                    fuel: route.data.routes[0].insights?.fuelCost || 0,
                    tolls: route.data.routes[0].insights?.tollCost || 0
                },
                departureRecommendation: this._getDepartureRecommendation(),
                confidence: 85
            };

        } catch (error) {
            logger.error('Quick recommendations error:', error.message);
            throw new Error('Failed to generate quick recommendations');
        }
    }

    /**
     * Get essential stops for quick route
     */
    async _getEssentialStops(route, preferences) {
        const stops = [];
        const distance = route.distance / 1000;
        
        // Add fuel stop if long journey
        if (distance > 150) {
            try {
                const midpoint = this._calculateMidpoint(route);
                const fuelStops = await this.mapplsService.getNearbyPlaces(
                    midpoint.lat, 
                    midpoint.lng, 
                    5000, 
                    'gas_station'
                );
                
                if (fuelStops.success && fuelStops.data.results.length > 0) {
                    stops.push({
                        type: 'fuel',
                        location: fuelStops.data.results[0],
                        reason: 'Recommended fuel stop for long journey'
                    });
                }
            } catch (error) {
                logger.warn('Error finding fuel stops:', error.message);
            }
        }

        return stops;
    }

    /**
     * Calculate midpoint of route
     */
    _calculateMidpoint(route) {
        const legs = route.legs || [];
        if (legs.length === 0) return null;
        
        const totalDuration = route.duration;
        const midDuration = totalDuration / 2;
        
        let accumulatedDuration = 0;
        
        for (const leg of legs) {
            if (accumulatedDuration + leg.duration >= midDuration) {
                return {
                    lat: leg.start_location.lat,
                    lng: leg.start_location.lng
                };
            }
            accumulatedDuration += leg.duration;
        }
        
        return legs[Math.floor(legs.length / 2)].start_location;
    }

    /**
     * Get traffic-aware recommendations
     */
    async _getTrafficAwareRecommendations(route) {
        const recommendations = [];
        const duration = route.duration / 60; // minutes
        
        // Current time analysis
        const now = new Date();
        const currentHour = now.getHours();
        
        if (currentHour >= 7 && currentHour <= 10) {
            recommendations.push({
                type: 'timing',
                message: 'Morning rush hour detected',
                suggestion: 'Consider delaying departure by 1-2 hours',
                timeSaving: '15-30 minutes'
            });
        }
        
        if (currentHour >= 17 && currentHour <= 20) {
            recommendations.push({
                type: 'timing',
                message: 'Evening rush hour detected',
                suggestion: 'Consider alternative route or delayed departure',
                timeSaving: '20-40 minutes'
            });
        }
        
        return recommendations;
    }

    /**
     * Get departure recommendation
     */
    _getDepartureRecommendation() {
        const now = new Date();
        const currentHour = now.getHours();
        
        if (currentHour >= 7 && currentHour <= 9) {
            return {
                recommendation: 'Wait 1-2 hours to avoid morning rush',
                optimalTime: '10:30 AM',
                benefit: 'Avoid traffic congestion'
            };
        }
        
        if (currentHour >= 17 && currentHour <= 19) {
            return {
                recommendation: 'Travel now or wait until after 8 PM',
                optimalTime: currentHour < 18 ? 'Now' : '8:30 PM',
                benefit: 'Minimize traffic delays'
            };
        }
        
        return {
            recommendation: 'Good time to travel',
            optimalTime: 'Now',
            benefit: 'Optimal traffic conditions'
        };
    }
}

module.exports = new AIPlannerService();
