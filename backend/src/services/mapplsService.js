const mapplsConfig = require('../config/mappls');
const logger = require('../utils/logger');
const geolib = require('geolib');

class MappLSService {
    constructor() {
        this.config = mapplsConfig;
        this.endpoints = this.config.getEndpoints();
        this.atlasEndpoints = this.config.getAtlasEndpoints();
        this.commonParams = this.config.getCommonParams();
    }

    /**
     * Geocoding - Convert address to coordinates
     */
    async geocode(address, region = 'IND') {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            const response = await axios.get(this.endpoints.geocoding, {
                params: {
                    address,
                    region,
                    ...this.commonParams
                }
            });

            return this._processResponse(response, 'Geocoding');
        } catch (error) {
            logger.error('Geocoding error:', error.message);
            throw this._handleError(error, 'Geocoding failed');
        }
    }

    /**
     * Reverse Geocoding - Convert coordinates to address
     */
    async reverseGeocode(lat, lng) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            const response = await axios.get(this.endpoints.reverseGeocoding, {
                params: {
                    lat,
                    lng,
                    ...this.commonParams
                }
            });

            return this._processResponse(response, 'Reverse Geocoding');
        } catch (error) {
            logger.error('Reverse geocoding error:', error.message);
            throw this._handleError(error, 'Reverse geocoding failed');
        }
    }

    /**
     * Get optimal route between points
     */
    async getRoute(origin, destination, waypoints = [], options = {}) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                start: `${origin.lat},${origin.lng}`,
                destination: `${destination.lat},${destination.lng}`,
                geometries: 'polyline',
                steps: true,
                overview: 'full',
                alternatives: options.alternatives || false,
                exclude: options.exclude || '',
                profile: options.profile || 'driving',
                ...this.commonParams
            };

            // Add waypoints if provided
            if (waypoints && waypoints.length > 0) {
                params.waypoints = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
            }

            const response = await axios.get(this.endpoints.routing, { params });
            const routeData = this._processResponse(response, 'Routing');

            // Enhance route data with additional information
            return this._enhanceRouteData(routeData, origin, destination, waypoints);
        } catch (error) {
            logger.error('Routing error:', error.message);
            throw this._handleError(error, 'Route calculation failed');
        }
    }

    /**
     * Get ETA for multiple destinations
     */
    async getETA(origin, destinations) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                centre: `${origin.lat},${origin.lng}`,
                pts: destinations.map(dest => `${dest.lat},${dest.lng}`).join('|'),
                ...this.commonParams
            };

            const response = await axios.get(this.endpoints.routeETA, { params });
            return this._processResponse(response, 'ETA');
        } catch (error) {
            logger.error('ETA calculation error:', error.message);
            throw this._handleError(error, 'ETA calculation failed');
        }
    }

    /**
     * Get distance matrix between multiple points
     */
    async getDistanceMatrix(origins, destinations) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                sources: origins.map(origin => `${origin.lat},${origin.lng}`).join('|'),
                destinations: destinations.map(dest => `${dest.lat},${dest.lng}`).join('|'),
                ...this.commonParams
            };

            const response = await axios.get(this.endpoints.distanceMatrix, { params });
            return this._processResponse(response, 'Distance Matrix');
        } catch (error) {
            logger.error('Distance matrix error:', error.message);
            throw this._handleError(error, 'Distance matrix calculation failed');
        }
    }

    /**
     * Search for nearby places
     */
    async getNearbyPlaces(lat, lng, radius = 1000, category = '', keywords = '') {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                keywords: keywords || category,
                refLocation: `${lat},${lng}`,
                radius,
                ...this.commonParams
            };

            const response = await axios.get(this.endpoints.placesNearby, { params });
            const placesData = this._processResponse(response, 'Nearby Places');

            // Enhance places data with additional information
            return this._enhancePlacesData(placesData, { lat, lng });
        } catch (error) {
            logger.error('Nearby places error:', error.message);
            throw this._handleError(error, 'Nearby places search failed');
        }
    }

    /**
     * Get detailed information about a place
     */
    async getPlaceDetails(placeId) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                place_id: placeId,
                ...this.commonParams
            };

            const response = await axios.get(this.endpoints.placesDetails, { params });
            return this._processResponse(response, 'Place Details');
        } catch (error) {
            logger.error('Place details error:', error.message);
            throw this._handleError(error, 'Place details fetch failed');
        }
    }

    /**
     * Autocomplete search for places
     */
    async searchPlaces(query, location = null, radius = 5000) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                query,
                ...this.commonParams
            };

            if (location) {
                params.location = `${location.lat},${location.lng}`;
                params.radius = radius;
            }

            const response = await axios.get(this.endpoints.placesAutocomplete, { params });
            return this._processResponse(response, 'Places Search');
        } catch (error) {
            logger.error('Places search error:', error.message);
            throw this._handleError(error, 'Places search failed');
        }
    }

    /**
     * Autosuggest places using Atlas API with static access token
     */
    async autosuggest(query, location = null, region = 'IND') {
        try {
            const axios = this.config.getAtlasAxios();
            
            const params = {
                query: query.trim(),
                region,
                access_token: this.config.accessToken
            };

            if (location) {
                params.location = `${location.lat},${location.lng}`;
            }

            const response = await axios.get(this.atlasEndpoints.autosuggest, { params });
            return this._processResponse(response, 'Autosuggest');
        } catch (error) {
            logger.error('Autosuggest error:', error.message);
            throw this._handleError(error, 'Autosuggest failed');
        }
    }

    /**
     * Get walking route between points
     */
    async getWalkingRoute(origin, destination, waypoints = []) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                start: `${origin.lat},${origin.lng}`,
                destination: `${destination.lat},${destination.lng}`,
                geometries: 'polyline',
                steps: true,
                overview: 'full',
                access_token: this.config.accessToken
            };

            // Add waypoints if provided
            if (waypoints && waypoints.length > 0) {
                params.waypoints = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
            }

            const response = await axios.get(this.endpoints.walkingRoute, { params });
            const routeData = this._processResponse(response, 'Walking Route');

            // Enhance route data with additional information
            return this._enhanceRouteData(routeData, origin, destination, waypoints);
        } catch (error) {
            logger.error('Walking route error:', error.message);
            throw this._handleError(error, 'Walking route calculation failed');
        }
    }

    /**
     * Text search for places with advanced filtering
     */
    async advancedTextSearch(query, location = null, bounds = null, category = '') {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                query,
                ...this.commonParams
            };

            if (location) {
                params.location = `${location.lat},${location.lng}`;
            }

            if (bounds) {
                params.bounds = `${bounds.sw.lat},${bounds.sw.lng}|${bounds.ne.lat},${bounds.ne.lng}`;
            }

            if (category) {
                params.filter = category;
            }

            const response = await axios.get(this.endpoints.textSearch, { params });
            return this._processResponse(response, 'Text Search');
        } catch (error) {
            logger.error('Text search error:', error.message);
            throw this._handleError(error, 'Text search failed');
        }
    }

    /**
     * Snap coordinates to nearest road
     */
    async snapToRoad(coordinates) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                path: coordinates.map(coord => `${coord.lat},${coord.lng}`).join('|'),
                ...this.commonParams
            };

            const response = await axios.get(this.endpoints.snapToRoad, { params });
            return this._processResponse(response, 'Snap to Road');
        } catch (error) {
            logger.error('Snap to road error:', error.message);
            throw this._handleError(error, 'Snap to road failed');
        }
    }

    /**
     * Get traffic information for a location
     */
    async getTrafficInfo(lat, lng, radius = 1000) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                lat,
                lng,
                radius,
                ...this.commonParams
            };

            const response = await axios.get(this.endpoints.traffic, { params });
            return this._processResponse(response, 'Traffic Info');
        } catch (error) {
            logger.error('Traffic info error:', error.message);
            throw this._handleError(error, 'Traffic information fetch failed');
        }
    }

    /**
     * Get POIs along a route
     */
    async getPOIsAlongRoute(route, category = '', buffer = 1000) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            const params = {
                path: route.geometry || route.overview_polyline,
                category,
                buffer,
                ...this.commonParams
            };

            const response = await axios.get(this.endpoints.poiCategories, { params });
            return this._processResponse(response, 'POIs Along Route');
        } catch (error) {
            logger.error('POIs along route error:', error.message);
            throw this._handleError(error, 'POIs along route fetch failed');
        }
    }

    /**
     * Generate static map URL
     */
    async getStaticMap(center, zoom = 15, size = '400x400', markers = []) {
        try {
            const token = await this.config.getAccessToken();
            
            let url = `${this.config.baseURL}${this.endpoints.staticMap}`;
            url += `?center=${center.lat},${center.lng}`;
            url += `&zoom=${zoom}`;
            url += `&size=${size}`;
            url += `&access_token=${token}`;

            // Add markers if provided
            if (markers.length > 0) {
                const markerString = markers.map(marker => 
                    `${marker.lat},${marker.lng}`
                ).join('|');
                url += `&markers=${markerString}`;
            }

            return { url, success: true };
        } catch (error) {
            logger.error('Static map error:', error.message);
            throw this._handleError(error, 'Static map generation failed');
        }
    }

    /**
     * Enhanced route data with travel insights
     */
    _enhanceRouteData(routeData, origin, destination, waypoints = []) {
        if (!routeData || !routeData.routes || routeData.routes.length === 0) {
            return routeData;
        }

        const route = routeData.routes[0];
        
        // Calculate additional metrics
        const enhancedRoute = {
            ...route,
            insights: {
                totalDistance: route.distance || 0,
                totalDuration: route.duration || 0,
                estimatedFuelCost: this._calculateFuelCost(route.distance),
                tollEstimate: this._estimateTolls(route),
                co2Emission: this._calculateCO2Emission(route.distance),
                difficultyScore: this._calculateDifficultyScore(route),
                bestTimeToTravel: this._suggestBestTime(),
                weatherConsiderations: this._getWeatherConsiderations()
            },
            waypoints: {
                origin: {
                    ...origin,
                    formatted_address: route.legs?.[0]?.start_address || 'Origin'
                },
                destination: {
                    ...destination,
                    formatted_address: route.legs?.[route.legs?.length - 1]?.end_address || 'Destination'
                },
                intermediate: waypoints
            }
        };

        return {
            ...routeData,
            routes: [enhancedRoute]
        };
    }

    /**
     * Enhance places data with additional information
     */
    _enhancePlacesData(placesData, userLocation) {
        if (!placesData || !placesData.results) {
            return placesData;
        }

        const enhancedResults = placesData.results.map(place => {
            const distance = geolib.getDistance(
                userLocation,
                { latitude: place.geometry?.location?.lat, longitude: place.geometry?.location?.lng }
            );

            return {
                ...place,
                userDistance: distance,
                walkingTime: Math.ceil(distance / 83.33), // Average walking speed 5 km/h
                drivingTime: Math.ceil(distance / 833.33), // Average city driving 50 km/h
                rewardPoints: this._calculatePlaceRewardPoints(place),
                visitRecommendation: this._getVisitRecommendation(place),
                popularTimes: this._estimatePopularTimes(place),
                averageVisitDuration: this._estimateVisitDuration(place)
            };
        });

        return {
            ...placesData,
            results: enhancedResults.sort((a, b) => a.userDistance - b.userDistance)
        };
    }

    /**
     * Calculate estimated fuel cost
     */
    _calculateFuelCost(distanceInMeters) {
        const distanceInKm = distanceInMeters / 1000;
        const fuelEfficiency = 15; // km per liter average
        const fuelPricePerLiter = 100; // INR average
        
        return Math.ceil((distanceInKm / fuelEfficiency) * fuelPricePerLiter);
    }

    /**
     * Estimate toll costs
     */
    _estimateTolls(route) {
        const distanceInKm = (route.distance || 0) / 1000;
        
        // Basic toll estimation - ₹2 per km for highways
        if (distanceInKm > 50) {
            return Math.ceil(distanceInKm * 2);
        }
        
        return 0;
    }

    /**
     * Calculate CO2 emission
     */
    _calculateCO2Emission(distanceInMeters) {
        const distanceInKm = distanceInMeters / 1000;
        const emissionFactor = 0.12; // kg CO2 per km for average car
        
        return Math.round(distanceInKm * emissionFactor * 100) / 100;
    }

    /**
     * Calculate route difficulty score
     */
    _calculateDifficultyScore(route) {
        let score = 1; // Base score
        
        const distanceInKm = (route.distance || 0) / 1000;
        const durationInHours = (route.duration || 0) / 3600;
        
        // Distance factor
        if (distanceInKm > 100) score += 1;
        if (distanceInKm > 300) score += 1;
        
        // Duration factor
        if (durationInHours > 3) score += 1;
        if (durationInHours > 6) score += 1;
        
        // Traffic consideration
        if (route.legs) {
            const hasTraffic = route.legs.some(leg => 
                leg.duration_in_traffic && leg.duration_in_traffic > leg.duration * 1.2
            );
            if (hasTraffic) score += 1;
        }
        
        return Math.min(score, 5); // Max score of 5
    }

    /**
     * Suggest best time to travel
     */
    _suggestBestTime() {
        const now = new Date();
        const hour = now.getHours();
        
        // Avoid rush hours (7-10 AM, 6-9 PM)
        if ((hour >= 7 && hour <= 10) || (hour >= 18 && hour <= 21)) {
            return {
                suggestion: 'Consider traveling after 10 PM or before 7 AM to avoid traffic',
                nextBestTime: hour < 12 ? '10:30 PM today' : '6:30 AM tomorrow',
                trafficLevel: 'high'
            };
        }
        
        return {
            suggestion: 'Good time to travel',
            trafficLevel: 'low',
            nextBestTime: null
        };
    }

    /**
     * Get weather considerations
     */
    _getWeatherConsiderations() {
        // This is a placeholder - integrate with weather API if needed
        return {
            recommendation: 'Check weather conditions before traveling',
            visibility: 'good',
            roadConditions: 'normal'
        };
    }

    /**
     * Calculate reward points for visiting a place
     */
    _calculatePlaceRewardPoints(place) {
        let points = 10; // Base points
        
        // Bonus for highly rated places
        if (place.rating && place.rating >= 4.0) points += 5;
        if (place.rating && place.rating >= 4.5) points += 5;
        
        // Bonus for popular places
        if (place.user_ratings_total && place.user_ratings_total > 100) points += 5;
        
        // Bonus for tourist attractions
        if (place.types && place.types.includes('tourist_attraction')) points += 10;
        
        return points;
    }

    /**
     * Get visit recommendation
     */
    _getVisitRecommendation(place) {
        const recommendations = [];
        
        if (place.rating && place.rating >= 4.0) {
            recommendations.push('Highly rated location');
        }
        
        if (place.types) {
            if (place.types.includes('restaurant')) {
                recommendations.push('Great for dining');
            }
            if (place.types.includes('tourist_attraction')) {
                recommendations.push('Must-visit attraction');
            }
            if (place.types.includes('park')) {
                recommendations.push('Perfect for relaxation');
            }
        }
        
        return recommendations.length > 0 ? recommendations.join(', ') : 'Worth visiting';
    }

    /**
     * Estimate popular times (placeholder)
     */
    _estimatePopularTimes(place) {
        // This is a simplified estimation - could be enhanced with real data
        return {
            busiest: '6 PM - 8 PM',
            leastBusy: '10 AM - 12 PM',
            recommendation: 'Visit during off-peak hours for better experience'
        };
    }

    /**
     * Estimate visit duration
     */
    _estimateVisitDuration(place) {
        if (!place.types) return 60; // Default 1 hour
        
        if (place.types.includes('restaurant')) return 90;
        if (place.types.includes('tourist_attraction')) return 120;
        if (place.types.includes('museum')) return 180;
        if (place.types.includes('park')) return 90;
        if (place.types.includes('shopping_mall')) return 120;
        
        return 60; // Default
    }

    /**
     * Process API response
     */
    _processResponse(response, operationType) {
        if (response.status === 200 && response.data) {
            logger.info(`${operationType} successful`);
            return {
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            };
        }
        
        throw new Error(`${operationType} returned invalid response`);
    }

    /**
     * Handle API errors
     */
    _handleError(error, defaultMessage) {
        const errorMessage = error.response?.data?.message || error.message || defaultMessage;
        const statusCode = error.response?.status || 500;
        
        return {
            success: false,
            error: errorMessage,
            statusCode,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get real-time traffic updates for a route
     */
    async getRealTimeTraffic(routeGeometry) {
        try {
            const axios = await this.config.getAuthenticatedAxios();
            
            // This would integrate with Mappls traffic API
            const params = {
                path: routeGeometry,
                ...this.commonParams
            };

            const response = await axios.get(this.endpoints.traffic, { params });
            return this._processResponse(response, 'Real-time Traffic');
        } catch (error) {
            logger.error('Real-time traffic error:', error.message);
            throw this._handleError(error, 'Real-time traffic fetch failed');
        }
    }

    /**
     * Get route alternatives with different criteria
     */
    async getRouteAlternatives(origin, destination, criteria = ['fastest', 'shortest', 'economic']) {
        const alternatives = [];
        
        for (const criterion of criteria) {
            try {
                const options = this._getRouteOptionsByCriteria(criterion);
                const route = await this.getRoute(origin, destination, [], options);
                
                if (route.success) {
                    alternatives.push({
                        type: criterion,
                        route: route.data,
                        recommendation: this._getRouteRecommendation(criterion, route.data)
                    });
                }
            } catch (error) {
                logger.warn(`Failed to get ${criterion} route:`, error.message);
            }
        }
        
        return {
            success: true,
            alternatives,
            recommendation: this._getBestRouteRecommendation(alternatives)
        };
    }

    /**
     * Get route options by criteria
     */
    _getRouteOptionsByCriteria(criteria) {
        const options = {
            alternatives: true
        };
        
        switch (criteria) {
            case 'fastest':
                options.profile = 'driving-traffic';
                break;
            case 'shortest':
                options.profile = 'driving';
                options.exclude = 'ferry';
                break;
            case 'economic':
                options.exclude = 'toll';
                options.profile = 'driving';
                break;
            default:
                options.profile = 'driving';
        }
        
        return options;
    }

    /**
     * Get route recommendation
     */
    _getRouteRecommendation(type, routeData) {
        const route = routeData.routes?.[0];
        if (!route) return 'Route not available';
        
        const distanceKm = Math.round((route.distance || 0) / 1000);
        const durationMin = Math.round((route.duration || 0) / 60);
        
        switch (type) {
            case 'fastest':
                return `Fastest route: ${durationMin} minutes, ${distanceKm} km`;
            case 'shortest':
                return `Shortest route: ${distanceKm} km, ${durationMin} minutes`;
            case 'economic':
                return `Most economical: Avoids tolls, ${distanceKm} km`;
            default:
                return `Route: ${distanceKm} km, ${durationMin} minutes`;
        }
    }

    /**
     * Get best route recommendation
     */
    _getBestRouteRecommendation(alternatives) {
        if (alternatives.length === 0) return 'No routes available';
        
        // Simple logic - can be enhanced
        const fastest = alternatives.find(alt => alt.type === 'fastest');
        const shortest = alternatives.find(alt => alt.type === 'shortest');
        const economic = alternatives.find(alt => alt.type === 'economic');
        
        if (fastest && fastest.route.routes?.[0]?.duration < 3600) {
            return 'Recommend fastest route for quick travel';
        }
        
        if (economic) {
            return 'Recommend economic route to save money';
        }
        
        return 'Multiple route options available';
    }
}

module.exports = new MappLSService();
