const express = require('express');
const { body, query } = require('express-validator');
const plannerController = require('../controllers/plannerController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/planner/ai-plan:
 *   post:
 *     summary: Generate AI-powered trip plan
 *     tags: [AI Planner]
 *     security:
 *       - bearerAuth: []
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
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   name:
 *                     type: string
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   name:
 *                     type: string
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *               budget:
 *                 type: string
 *                 enum: [low, medium, high]
 *               travelMode:
 *                 type: string
 *                 enum: [driving, walking, cycling]
 *               timeConstraints:
 *                 type: object
 *                 properties:
 *                   departureTime:
 *                     type: string
 *                     format: date-time
 *                   maxDuration:
 *                     type: number
 *     responses:
 *       200:
 *         description: AI trip plan generated successfully
 *       400:
 *         description: Invalid request parameters
 */
router.post('/ai-plan', [
    authenticateToken,
    body('origin.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Origin latitude must be between -90 and 90'),
    body('origin.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Origin longitude must be between -180 and 180'),
    body('destination.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Destination latitude must be between -90 and 90'),
    body('destination.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Destination longitude must be between -180 and 180'),
    body('interests')
        .optional()
        .isArray()
        .withMessage('Interests must be an array'),
    body('budget')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Budget must be low, medium, or high'),
    body('travelMode')
        .optional()
        .isIn(['driving', 'walking', 'cycling', 'public_transport'])
        .withMessage('Invalid travel mode')
], plannerController.generateAIPlan);

/**
 * @swagger
 * /api/planner/quick-recommendations:
 *   post:
 *     summary: Get quick travel recommendations
 *     tags: [AI Planner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentLocation
 *               - destination
 *             properties:
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Quick recommendations generated successfully
 */
router.post('/quick-recommendations', [
    authenticateToken,
    body('currentLocation.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Current location latitude must be between -90 and 90'),
    body('currentLocation.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Current location longitude must be between -180 and 180'),
    body('destination.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Destination latitude must be between -90 and 90'),
    body('destination.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Destination longitude must be between -180 and 180')
], plannerController.getQuickRecommendations);

/**
 * @swagger
 * /api/planner/manual-plan:
 *   post:
 *     summary: Create manual trip plan
 *     tags: [Manual Planner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - origin
 *               - destination
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               origin:
 *                 type: object
 *               destination:
 *                 type: object
 *               waypoints:
 *                 type: array
 *                 items:
 *                   type: object
 *               preferences:
 *                 type: object
 *     responses:
 *       201:
 *         description: Manual trip plan created successfully
 */
router.post('/manual-plan', [
    authenticateToken,
    body('title')
        .isLength({ min: 3, max: 100 })
        .withMessage('Title must be between 3 and 100 characters')
        .trim(),
    body('origin.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Origin latitude must be between -90 and 90'),
    body('origin.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Origin longitude must be between -180 and 180'),
    body('destination.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Destination latitude must be between -90 and 90'),
    body('destination.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Destination longitude must be between -180 and 180')
], plannerController.createManualPlan);

/**
 * @swagger
 * /api/planner/optimize-route:
 *   post:
 *     summary: Optimize waypoint order for manual plan
 *     tags: [Manual Planner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - waypoints
 *             properties:
 *               waypoints:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Route optimized successfully
 */
router.post('/optimize-route', [
    authenticateToken,
    body('waypoints')
        .isArray({ min: 2 })
        .withMessage('At least 2 waypoints are required for optimization')
], plannerController.optimizeRoute);

/**
 * @swagger
 * /api/planner/search-places:
 *   get:
 *     summary: Search for places to add to trip
 *     tags: [Manual Planner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Reference latitude
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: Reference longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5000
 *         description: Search radius in meters
 *     responses:
 *       200:
 *         description: Places found successfully
 */
router.get('/search-places', [
    optionalAuth,
    query('query')
        .isLength({ min: 2, max: 100 })
        .withMessage('Query must be between 2 and 100 characters'),
    query('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    query('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    query('radius')
        .optional()
        .isInt({ min: 100, max: 50000 })
        .withMessage('Radius must be between 100 and 50000 meters')
], plannerController.searchPlaces);

/**
 * @swagger
 * /api/planner/nearby-places:
 *   get:
 *     summary: Get nearby places of interest
 *     tags: [Places]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 2000
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Place category filter
 *     responses:
 *       200:
 *         description: Nearby places retrieved successfully
 */
router.get('/nearby-places', [
    optionalAuth,
    query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    query('radius')
        .optional()
        .isInt({ min: 100, max: 50000 })
        .withMessage('Radius must be between 100 and 50000 meters'),
    query('category')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be between 2 and 50 characters')
], plannerController.getNearbyPlaces);

/**
 * @swagger
 * /api/planner/place-details/{placeId}:
 *   get:
 *     summary: Get detailed information about a place
 *     tags: [Places]
 *     parameters:
 *       - in: path
 *         name: placeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Place details retrieved successfully
 *       404:
 *         description: Place not found
 */
router.get('/place-details/:placeId', optionalAuth, plannerController.getPlaceDetails);

/**
 * @swagger
 * /api/planner/route-alternatives:
 *   post:
 *     summary: Get route alternatives between two points
 *     tags: [Routing]
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
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               criteria:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [fastest, shortest, economic, scenic]
 *     responses:
 *       200:
 *         description: Route alternatives generated successfully
 */
router.post('/route-alternatives', [
    optionalAuth,
    body('origin.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Origin latitude must be between -90 and 90'),
    body('origin.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Origin longitude must be between -180 and 180'),
    body('destination.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Destination latitude must be between -90 and 90'),
    body('destination.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Destination longitude must be between -180 and 180')
], plannerController.getRouteAlternatives);

/**
 * @swagger
 * /api/planner/save-plan:
 *   post:
 *     summary: Save generated trip plan
 *     tags: [Trip Planning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planData
 *               - title
 *             properties:
 *               planData:
 *                 type: object
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledStartTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Trip plan saved successfully
 */
router.post('/save-plan', [
    authenticateToken,
    body('title')
        .isLength({ min: 3, max: 100 })
        .withMessage('Title must be between 3 and 100 characters')
        .trim(),
    body('planData')
        .notEmpty()
        .withMessage('Plan data is required')
], plannerController.savePlan);

/**
 * @swagger
 * /api/planner/popular-destinations:
 *   get:
 *     summary: Get popular destinations based on user location
 *     tags: [Places]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 50000
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Popular destinations retrieved successfully
 */
router.get('/popular-destinations', [
    optionalAuth,
    query('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    query('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    query('radius')
        .optional()
        .isInt({ min: 1000, max: 100000 })
        .withMessage('Radius must be between 1000 and 100000 meters'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50')
], plannerController.getPopularDestinations);

/**
 * @swagger
 * /api/planner/travel-insights:
 *   post:
 *     summary: Get travel insights for a route
 *     tags: [AI Planner]
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
 *               destination:
 *                 type: object
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Travel insights generated successfully
 */
router.post('/travel-insights', [
    optionalAuth,
    body('origin.latitude')
        .isFloat({ min: -90, max: 90 }),
    body('origin.longitude')
        .isFloat({ min: -180, max: 180 }),
    body('destination.latitude')
        .isFloat({ min: -90, max: 90 }),
    body('destination.longitude')
        .isFloat({ min: -180, max: 180 })
], plannerController.getTravelInsights);

/**
 * @swagger
 * /api/planner/validate-waypoints:
 *   post:
 *     summary: Validate and enhance waypoints with Mappls data
 *     tags: [Manual Planner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - waypoints
 *             properties:
 *               waypoints:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Waypoints validated successfully
 */
router.post('/validate-waypoints', [
    authenticateToken,
    body('waypoints')
        .isArray({ min: 1 })
        .withMessage('At least 1 waypoint is required')
], plannerController.validateWaypoints);

/**
 * @swagger
 * /api/planner/autosuggest:
 *   get:
 *     summary: Get place autosuggest recommendations
 *     tags: [Places]
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
    optionalAuth,
    query('query')
        .isLength({ min: 2, max: 100 })
        .withMessage('Query must be between 2 and 100 characters'),
    query('region')
        .optional()
        .isLength({ min: 2, max: 3 })
        .withMessage('Region must be 2-3 characters')
], plannerController.getAutosuggest);

/**
 * @swagger
 * /api/planner/walking-route:
 *   post:
 *     summary: Get walking route between points
 *     tags: [Routing]
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
 *     responses:
 *       200:
 *         description: Walking route calculated successfully
 */
router.post('/walking-route', [
    optionalAuth,
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
        .withMessage('Destination longitude must be between -180 and 180')
], plannerController.getWalkingRoute);

module.exports = router;
