const axios = require('axios');
const logger = require('../utils/logger');
const tokenService = require('./tokenService');

class MapplsApiService {
    constructor() {
        this.atlasBaseURL = 'https://atlas.mappls.com';
        this.apisBaseURL = 'https://apis.mappls.com';
        this.outpostBaseURL = 'https://outpost.mappls.com';
    }

    /**
     * Get AutoSuggest results - corrected endpoint
     */
    async getAutoSuggest(query, location = null, region = 'IND') {
        try {
            const token = await tokenService.getAccessToken();
            
            // Try different possible autosuggest endpoints
            const possibleEndpoints = [
                'https://atlas.mappls.com/api/places/autosuggest',
                'https://atlas.mappls.com/places/autosuggest',
                'https://apis.mappls.com/advancedmaps/v1/autosuggest',
                'https://apis.mappls.com/advancedmaps/v1/places/search/json'
            ];

            const params = {
                query: query.trim(),
                region,
                access_token: token
            };

            if (location) {
                params.location = `${location.lat},${location.lng}`;
            }

            for (const endpoint of possibleEndpoints) {
                try {
                    logger.info(`Trying autosuggest endpoint: ${endpoint}`);
                    
                    const response = await axios.get(endpoint, { 
                        params,
                        timeout: 10000
                    });

                    if (response.status === 200) {
                        logger.info(`Autosuggest successful with endpoint: ${endpoint}`);
                        return {
                            success: true,
                            data: response.data,
                            endpoint: endpoint,
                            timestamp: new Date().toISOString()
                        };
                    }
                } catch (error) {
                    logger.warn(`Endpoint ${endpoint} failed:`, {
                        status: error.response?.status,
                        message: error.message
                    });
                    continue;
                }
            }

            throw new Error('All autosuggest endpoints failed');
        } catch (error) {
            logger.error('AutoSuggest error:', error.message);
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status || 500
            };
        }
    }

    /**
     * Get nearby places with enhanced error handling
     */
    async getNearbyPlaces(refLocation, keywords = '', radius = 1000, page = 1) {
        try {
            const token = await tokenService.getAccessToken();
            
            const params = {
                refLocation,
                keywords,
                radius,
                page,
                access_token: token
            };

            const response = await axios.get(`${this.atlasBaseURL}/api/places/nearby/json`, {
                params,
                timeout: 10000
            });

            return {
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Nearby places error:', error.message);
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status || 500
            };
        }
    }

    /**
     * Get place details using eLoc/place ID
     */
    async getPlaceDetails(placeId) {
        try {
            const token = await tokenService.getAccessToken();
            
            const params = {
                place_id: placeId,
                access_token: token
            };

            const response = await axios.get(`${this.apisBaseURL}/advancedmaps/v1/place_detail`, {
                params,
                timeout: 10000
            });

            return {
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Place details error:', error.message);
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status || 500
            };
        }
    }

    /**
     * Get directions between points
     */
    async getDirections(origin, destination, waypoints = [], profile = 'driving') {
        try {
            const token = await tokenService.getAccessToken();
            
            const params = {
                start: `${origin.lat},${origin.lng}`,
                destination: `${destination.lat},${destination.lng}`,
                geometries: 'polyline',
                steps: true,
                overview: 'full',
                alternatives: true,
                access_token: token
            };

            // Add waypoints if provided
            if (waypoints && waypoints.length > 0) {
                params.waypoints = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
            }

            const endpoint = `${this.apisBaseURL}/advancedmaps/v1/route_adv/${profile}`;
            const response = await axios.get(endpoint, {
                params,
                timeout: 15000
            });

            return {
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Directions error:', error.message);
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status || 500
            };
        }
    }

    /**
     * Get reverse geocoding
     */
    async reverseGeocode(lat, lng) {
        try {
            const token = await tokenService.getAccessToken();
            
            const params = {
                lat,
                lng,
                access_token: token
            };

            const response = await axios.get(`${this.apisBaseURL}/advancedmaps/v1/rev_geocode`, {
                params,
                timeout: 10000
            });

            return {
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Reverse geocode error:', error.message);
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status || 500
            };
        }
    }

    /**
     * Get distance matrix
     */
    async getDistanceMatrix(sources, destinations, profile = 'driving') {
        try {
            const token = await tokenService.getAccessToken();
            
            const params = {
                sources: sources.map(s => `${s.lat},${s.lng}`).join('|'),
                destinations: destinations.map(d => `${d.lat},${d.lng}`).join('|'),
                access_token: token
            };

            const response = await axios.get(`${this.apisBaseURL}/advancedmaps/v1/distance_matrix/${profile}`, {
                params,
                timeout: 15000
            });

            return {
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Distance matrix error:', error.message);
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status || 500
            };
        }
    }

    /**
     * Test API connectivity and token validity
     */
    async testConnectivity() {
        const results = {
            token: await tokenService.getTokenInfo(),
            tests: {}
        };

        // Test autosuggest
        try {
            const autosuggestResult = await this.getAutoSuggest('test');
            results.tests.autosuggest = {
                success: autosuggestResult.success,
                endpoint: autosuggestResult.endpoint,
                error: autosuggestResult.error
            };
        } catch (error) {
            results.tests.autosuggest = {
                success: false,
                error: error.message
            };
        }

        // Test nearby places
        try {
            const nearbyResult = await this.getNearbyPlaces('28.7041,77.1025', '', 1000);
            results.tests.nearby = {
                success: nearbyResult.success,
                error: nearbyResult.error
            };
        } catch (error) {
            results.tests.nearby = {
                success: false,
                error: error.message
            };
        }

        // Test directions
        try {
            const directionsResult = await this.getDirections(
                { lat: 28.7041, lng: 77.1025 },
                { lat: 28.7041, lng: 77.1035 }
            );
            results.tests.directions = {
                success: directionsResult.success,
                error: directionsResult.error
            };
        } catch (error) {
            results.tests.directions = {
                success: false,
                error: error.message
            };
        }

        return results;
    }
}

module.exports = new MapplsApiService();
