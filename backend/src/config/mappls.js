const axios = require('axios');
const logger = require('../utils/logger');
const tokenService = require('../services/tokenService');

class MappLSConfig {
    constructor() {
        this.baseURL = process.env.MAPPLS_BASE_URL || 'https://apis.mappls.com';
        this.atlasBaseURL = 'https://atlas.mappls.com';
        this.clientId = process.env.MAPPLS_CLIENT_ID;
        this.clientSecret = process.env.MAPPLS_CLIENT_SECRET;
        this.accessToken = process.env.MAPPLS_ACCESS_TOKEN;
        this.projectCode = process.env.MAPPLS_PROJECT_CODE;
        
        // Token management
        this.tokenExpiry = null;
        this.refreshTokenInterval = null;
        
        // For static access token, we don't need token refresh
        if (this.accessToken && !this.clientId) {
            logger.info('Using static access token for Mappls API');
        } else if (this.clientId && this.clientSecret) {
            this.initializeTokenRefresh();
        } else {
            logger.warn('No valid Mappls credentials found');
        }
    }

    /**
     * Initialize automatic token refresh
     */
    initializeTokenRefresh() {
        // Refresh token every 18 hours (token expires in 67004 seconds ≈ 18.6 hours)
        this.refreshTokenInterval = setInterval(() => {
            this.refreshAccessToken();
        }, 18 * 60 * 60 * 1000); // 18 hours
    }

    /**
     * Get fresh access token from Mappls
     */
    async refreshAccessToken() {
        try {
            const response = await axios.post(`${this.baseURL}/advancedmaps/v1/authenticate`, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token;
                this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
                logger.info('Mappls access token refreshed successfully');
                return this.accessToken;
            }
        } catch (error) {
            logger.error('Failed to refresh Mappls access token:', error.message);
            throw new Error('Failed to authenticate with Mappls API');
        }
    }

    /**
     * Get current valid access token
     */
    async getAccessToken() {
        return await tokenService.getAccessToken();
    }

    /**
     * Get configured Axios instance with authentication
     */
    async getAuthenticatedAxios() {
        const token = await this.getAccessToken();
        
        return axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    /**
     * Get Axios instance for Atlas endpoints that use static access token
     */
    getAtlasAxios() {
        return axios.create({
            baseURL: this.atlasBaseURL,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    /**
     * API endpoint configurations
     */
    getEndpoints() {
        return {
            // Geocoding APIs
            geocoding: '/advancedmaps/v1/geocode',
            reverseGeocoding: '/advancedmaps/v1/rev_geocode',
            
            // Routing APIs
            routing: '/advancedmaps/v1/route_adv/driving',
            walkingRoute: '/advancedmaps/v1/route_adv/walking',
            routeETA: '/advancedmaps/v1/route_eta',
            distanceMatrix: '/advancedmaps/v1/distance_matrix/driving',
            
            // Places APIs
            placesNearby: '/advancedmaps/v1/places/nearby/json',
            placesDetails: '/advancedmaps/v1/places/details',
            placesAutocomplete: '/advancedmaps/v1/places/search/json',
            
            // Navigation APIs
            snapToRoad: '/advancedmaps/v1/snapToRoad',
            nearestRoads: '/advancedmaps/v1/nearest_roads',
            
            // Traffic APIs
            traffic: '/advancedmaps/v1/traffic_info',
            
            // Static Map APIs
            staticMap: '/advancedmaps/v1/still_map',
            
            // POI Categories
            poiCategories: '/advancedmaps/v1/poi_along_route',
            
            // Textsearch
            textSearch: '/advancedmaps/v1/textsearch'
        };
    }

    /**
     * Get Atlas API endpoints that use static access token
     */
    getAtlasEndpoints() {
        return {
            // Atlas Places APIs (use static access token)
            autosuggest: '/api/places/autosuggest',
            atlasNearby: '/api/places/nearby/json'
        };
    }

    /**
     * Get common request parameters
     */
    getCommonParams() {
        return {
            region: 'IND',
            output: 'json'
        };
    }
}

module.exports = new MappLSConfig();
