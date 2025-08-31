const express = require('express');
const { body, query } = require('express-validator');
const mapplsApiService = require('../services/mapplsApiService');
const tokenService = require('../services/tokenService');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * /api/mappls/autosuggest:
 *   get:
 *     summary: Get place autosuggest recommendations
 *     tags: [Mappls API]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Bias location in lat,lng format
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           default: IND
 *     responses:
 *       200:
 *         description: Autosuggest results retrieved successfully
 */
router.get('/autosuggest', [
    query('query')
        .isLength({ min: 2, max: 100 })
        .withMessage('Query must be between 2 and 100 characters'),
    query('region')
        .optional()
        .isLength({ min: 2, max: 3 })
        .withMessage('Region must be 2-3 characters')
], async (req, res) => {
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

        const result = await mapplsApiService.getAutoSuggest(query, locationObj, region);

        if (!result.success) {
            return res.status(result.statusCode || 400).json({
                success: false,
                message: 'Autosuggest failed',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Autosuggest results retrieved successfully',
            data: result.data,
            endpoint: result.endpoint
        });

    } catch (error) {
        logger.error('Autosuggest API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get autosuggest results'
        });
    }
});

/**
 * @swagger
 * /api/mappls/nearby:
 *   get:
 *     summary: Get nearby places
 *     tags: [Mappls API]
 *     parameters:
 *       - in: query
 *         name: refLocation
 *         required: true
 *         schema:
 *           type: string
 *         description: Reference location in lat,lng format
 *       - in: query
 *         name: keywords
 *         schema:
 *           type: string
 *         description: Search keywords
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 1000
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *     responses:
 *       200:
 *         description: Nearby places retrieved successfully
 */
router.get('/nearby', [
    query('refLocation')
        .notEmpty()
        .withMessage('Reference location is required'),
    query('radius')
        .optional()
        .isInt({ min: 100, max: 50000 })
        .withMessage('Radius must be between 100 and 50000 meters'),
    query('page')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Page must be between 1 and 100')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { refLocation, keywords = '', radius = 1000, page = 1 } = req.query;

        const result = await mapplsApiService.getNearbyPlaces(
            refLocation,
            keywords,
            parseInt(radius),
            parseInt(page)
        );

        if (!result.success) {
            return res.status(result.statusCode || 400).json({
                success: false,
                message: 'Failed to fetch nearby places',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Nearby places retrieved successfully',
            data: result.data
        });

    } catch (error) {
        logger.error('Nearby places API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get nearby places'
        });
    }
});

/**
 * @swagger
 * /api/mappls/place-details/{placeId}:
 *   get:
 *     summary: Get detailed information about a place
 *     tags: [Mappls API]
 *     parameters:
 *       - in: path
 *         name: placeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Place details retrieved successfully
 */
router.get('/place-details/:placeId', async (req, res) => {
    try {
        const { placeId } = req.params;

        const result = await mapplsApiService.getPlaceDetails(placeId);

        if (!result.success) {
            return res.status(result.statusCode || 404).json({
                success: false,
                message: 'Place not found',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Place details retrieved successfully',
            data: result.data
        });

    } catch (error) {
        logger.error('Place details API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get place details'
        });
    }
});

/**
 * @swagger
 * /api/mappls/directions:
 *   post:
 *     summary: Get directions between points
 *     tags: [Mappls API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               waypoints:
 *                 type: array
 *                 items:
 *                   type: object
 *               profile:
 *                 type: string
 *                 enum: [driving, walking, cycling]
 *                 default: driving
 *     responses:
 *       200:
 *         description: Directions retrieved successfully
 */
router.post('/directions', [
    body('origin.lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Origin latitude must be between -90 and 90'),
    body('origin.lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Origin longitude must be between -180 and 180'),
    body('destination.lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Destination latitude must be between -90 and 90'),
    body('destination.lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Destination longitude must be between -180 and 180'),
    body('profile')
        .optional()
        .isIn(['driving', 'walking', 'cycling'])
        .withMessage('Invalid profile type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { origin, destination, waypoints = [], profile = 'driving' } = req.body;

        const result = await mapplsApiService.getDirections(origin, destination, waypoints, profile);

        if (!result.success) {
            return res.status(result.statusCode || 400).json({
                success: false,
                message: 'Failed to get directions',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Directions retrieved successfully',
            data: result.data
        });

    } catch (error) {
        logger.error('Directions API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get directions'
        });
    }
});

/**
 * @swagger
 * /api/mappls/reverse-geocode:
 *   get:
 *     summary: Convert coordinates to address
 *     tags: [Mappls API]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Address retrieved successfully
 */
router.get('/reverse-geocode', [
    query('lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    query('lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { lat, lng } = req.query;

        const result = await mapplsApiService.reverseGeocode(parseFloat(lat), parseFloat(lng));

        if (!result.success) {
            return res.status(result.statusCode || 400).json({
                success: false,
                message: 'Reverse geocoding failed',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Address retrieved successfully',
            data: result.data
        });

    } catch (error) {
        logger.error('Reverse geocode API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to reverse geocode'
        });
    }
});

/**
 * @swagger
 * /api/mappls/distance-matrix:
 *   post:
 *     summary: Get distance matrix between multiple points
 *     tags: [Mappls API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sources
 *               - destinations
 *             properties:
 *               sources:
 *                 type: array
 *                 items:
 *                   type: object
 *               destinations:
 *                 type: array
 *                 items:
 *                   type: object
 *               profile:
 *                 type: string
 *                 enum: [driving, walking, cycling]
 *                 default: driving
 *     responses:
 *       200:
 *         description: Distance matrix calculated successfully
 */
router.post('/distance-matrix', [
    body('sources')
        .isArray({ min: 1 })
        .withMessage('At least 1 source is required'),
    body('destinations')
        .isArray({ min: 1 })
        .withMessage('At least 1 destination is required'),
    body('profile')
        .optional()
        .isIn(['driving', 'walking', 'cycling'])
        .withMessage('Invalid profile type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { sources, destinations, profile = 'driving' } = req.body;

        const result = await mapplsApiService.getDistanceMatrix(sources, destinations, profile);

        if (!result.success) {
            return res.status(result.statusCode || 400).json({
                success: false,
                message: 'Distance matrix calculation failed',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Distance matrix calculated successfully',
            data: result.data
        });

    } catch (error) {
        logger.error('Distance matrix API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate distance matrix'
        });
    }
});

/**
 * @swagger
 * /api/mappls/token-info:
 *   get:
 *     summary: Get current token information
 *     tags: [Mappls API]
 *     responses:
 *       200:
 *         description: Token information retrieved successfully
 */
router.get('/token-info', async (req, res) => {
    try {
        const tokenInfo = await tokenService.getTokenInfo();
        
        res.json({
            success: true,
            message: 'Token information retrieved successfully',
            data: tokenInfo
        });

    } catch (error) {
        logger.error('Token info API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get token information'
        });
    }
});

/**
 * @swagger
 * /api/mappls/test-connectivity:
 *   get:
 *     summary: Test Mappls API connectivity and token validity
 *     tags: [Mappls API]
 *     responses:
 *       200:
 *         description: Connectivity test completed
 */
router.get('/test-connectivity', async (req, res) => {
    try {
        const results = await mapplsApiService.testConnectivity();
        
        res.json({
            success: true,
            message: 'Connectivity test completed',
            data: results
        });

    } catch (error) {
        logger.error('Connectivity test error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to test connectivity'
        });
    }
});

/**
 * @swagger
 * /api/mappls/refresh-token:
 *   post:
 *     summary: Force refresh access token
 *     tags: [Mappls API]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
router.post('/refresh-token', async (req, res) => {
    try {
        const newToken = await tokenService.forceRefresh();
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                tokenUpdated: true,
                tokenInfo: await tokenService.getTokenInfo()
            }
        });

    } catch (error) {
        logger.error('Token refresh API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token',
            error: error.message
        });
    }
});

module.exports = router;
