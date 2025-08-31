const express = require('express');
const { body, query } = require('express-validator');
const navigationController = require('../controllers/navigationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/navigation/start-trip/{tripId}:
 *   post:
 *     summary: Start navigation for a trip
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Navigation started successfully
 *       404:
 *         description: Trip not found
 */
router.post('/start-trip/:tripId', authenticateToken, navigationController.startTrip);

/**
 * @swagger
 * /api/navigation/stop-trip/{tripId}:
 *   post:
 *     summary: Stop navigation for a trip
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Navigation stopped successfully
 */
router.post('/stop-trip/:tripId', authenticateToken, navigationController.stopTrip);

/**
 * @swagger
 * /api/navigation/update-location:
 *   post:
 *     summary: Update user location during navigation
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               accuracy:
 *                 type: number
 *               speed:
 *                 type: number
 *               heading:
 *                 type: number
 *               tripId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.post('/update-location', [
    authenticateToken,
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    body('accuracy')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Accuracy must be a positive number'),
    body('speed')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Speed must be a positive number'),
    body('heading')
        .optional()
        .isFloat({ min: 0, max: 360 })
        .withMessage('Heading must be between 0 and 360 degrees')
], navigationController.updateLocation);

/**
 * @swagger
 * /api/navigation/get-directions:
 *   post:
 *     summary: Get turn-by-turn directions
 *     tags: [Navigation]
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
 *               waypoints:
 *                 type: array
 *                 items:
 *                   type: object
 *               avoidTolls:
 *                 type: boolean
 *               avoidHighways:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Directions retrieved successfully
 */
router.post('/get-directions', [
    body('origin.latitude')
        .isFloat({ min: -90, max: 90 }),
    body('origin.longitude')
        .isFloat({ min: -180, max: 180 }),
    body('destination.latitude')
        .isFloat({ min: -90, max: 90 }),
    body('destination.longitude')
        .isFloat({ min: -180, max: 180 })
], navigationController.getDirections);

/**
 * @swagger
 * /api/navigation/traffic-info:
 *   get:
 *     summary: Get real-time traffic information
 *     tags: [Navigation]
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
 *     responses:
 *       200:
 *         description: Traffic information retrieved successfully
 */
router.get('/traffic-info', [
    query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    query('radius')
        .optional()
        .isInt({ min: 100, max: 50000 })
        .withMessage('Radius must be between 100 and 50000 meters')
], navigationController.getTrafficInfo);

/**
 * @swagger
 * /api/navigation/snap-to-road:
 *   post:
 *     summary: Snap GPS coordinates to nearest road
 *     tags: [Navigation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coordinates
 *             properties:
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *     responses:
 *       200:
 *         description: Coordinates snapped to road successfully
 */
router.post('/snap-to-road', [
    body('coordinates')
        .isArray({ min: 1 })
        .withMessage('At least 1 coordinate is required')
], navigationController.snapToRoad);

/**
 * @swagger
 * /api/navigation/eta:
 *   post:
 *     summary: Get estimated time of arrival
 *     tags: [Navigation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destinations
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destinations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *     responses:
 *       200:
 *         description: ETA calculated successfully
 */
router.post('/eta', [
    body('origin.latitude')
        .isFloat({ min: -90, max: 90 }),
    body('origin.longitude')
        .isFloat({ min: -180, max: 180 }),
    body('destinations')
        .isArray({ min: 1 })
        .withMessage('At least 1 destination is required')
], navigationController.getETA);

/**
 * @swagger
 * /api/navigation/distance-matrix:
 *   post:
 *     summary: Get distance matrix between multiple points
 *     tags: [Navigation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origins
 *               - destinations
 *             properties:
 *               origins:
 *                 type: array
 *                 items:
 *                   type: object
 *               destinations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Distance matrix calculated successfully
 */
router.post('/distance-matrix', [
    body('origins')
        .isArray({ min: 1 })
        .withMessage('At least 1 origin is required'),
    body('destinations')
        .isArray({ min: 1 })
        .withMessage('At least 1 destination is required')
], navigationController.getDistanceMatrix);

/**
 * @swagger
 * /api/navigation/geocode:
 *   get:
 *     summary: Convert address to coordinates
 *     tags: [Navigation]
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Address to geocode
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           default: IND
 *     responses:
 *       200:
 *         description: Address geocoded successfully
 */
router.get('/geocode', [
    query('address')
        .isLength({ min: 3, max: 200 })
        .withMessage('Address must be between 3 and 200 characters'),
    query('region')
        .optional()
        .isLength({ min: 2, max: 3 })
        .withMessage('Region must be 2-3 characters')
], navigationController.geocodeAddress);

/**
 * @swagger
 * /api/navigation/reverse-geocode:
 *   get:
 *     summary: Convert coordinates to address
 *     tags: [Navigation]
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
 *     responses:
 *       200:
 *         description: Coordinates reverse geocoded successfully
 */
router.get('/reverse-geocode', [
    query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
], navigationController.reverseGeocode);

/**
 * @swagger
 * /api/navigation/static-map:
 *   get:
 *     summary: Generate static map URL
 *     tags: [Navigation]
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
 *         name: zoom
 *         schema:
 *           type: number
 *           default: 15
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           default: 400x400
 *     responses:
 *       200:
 *         description: Static map URL generated successfully
 */
router.get('/static-map', [
    query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    query('zoom')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Zoom must be between 1 and 20'),
    query('size')
        .optional()
        .matches(/^\d+x\d+$/)
        .withMessage('Size must be in format WidthxHeight (e.g., 400x400)')
], navigationController.getStaticMap);

/**
 * @swagger
 * /api/navigation/emergency-alert:
 *   post:
 *     summary: Send emergency alert with location
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - emergencyType
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               emergencyType:
 *                 type: string
 *                 enum: [accident, breakdown, medical, security, general]
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Emergency alert sent successfully
 */
router.post('/emergency-alert', [
    authenticateToken,
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    body('emergencyType')
        .isIn(['accident', 'breakdown', 'medical', 'security', 'general'])
        .withMessage('Invalid emergency type'),
    body('message')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Message must be at most 500 characters')
], navigationController.sendEmergencyAlert);

/**
 * @swagger
 * /api/navigation/share-location:
 *   post:
 *     summary: Share live location with other users
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shareWithUserIds
 *             properties:
 *               shareWithUserIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               duration:
 *                 type: number
 *                 description: Duration in minutes
 *     responses:
 *       200:
 *         description: Location sharing started successfully
 */
router.post('/share-location', [
    authenticateToken,
    body('shareWithUserIds')
        .isArray({ min: 1 })
        .withMessage('At least 1 user ID is required for sharing'),
    body('duration')
        .optional()
        .isInt({ min: 5, max: 1440 })
        .withMessage('Duration must be between 5 and 1440 minutes (24 hours)')
], navigationController.shareLocation);

/**
 * @swagger
 * /api/navigation/trip-status/{tripId}:
 *   get:
 *     summary: Get current trip status and progress
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip status retrieved successfully
 *       404:
 *         description: Trip not found
 */
router.get('/trip-status/:tripId', authenticateToken, navigationController.getTripStatus);

/**
 * @swagger
 * /api/navigation/waypoint-reached:
 *   post:
 *     summary: Mark waypoint as reached
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tripId
 *               - waypointIndex
 *             properties:
 *               tripId:
 *                 type: string
 *               waypointIndex:
 *                 type: number
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: Waypoint marked as reached successfully
 */
router.post('/waypoint-reached', [
    authenticateToken,
    body('tripId')
        .notEmpty()
        .withMessage('Trip ID is required'),
    body('waypointIndex')
        .isInt({ min: 0 })
        .withMessage('Waypoint index must be a non-negative integer'),
    body('currentLocation.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('currentLocation.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
], navigationController.markWaypointReached);

/**
 * @swagger
 * /api/navigation/reroute:
 *   post:
 *     summary: Calculate new route due to traffic or user preference
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tripId
 *               - currentLocation
 *             properties:
 *               tripId:
 *                 type: string
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               reason:
 *                 type: string
 *                 enum: [traffic, user_preference, road_closure, accident]
 *     responses:
 *       200:
 *         description: New route calculated successfully
 */
router.post('/reroute', [
    authenticateToken,
    body('tripId')
        .notEmpty()
        .withMessage('Trip ID is required'),
    body('currentLocation.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('currentLocation.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    body('reason')
        .optional()
        .isIn(['traffic', 'user_preference', 'road_closure', 'accident'])
        .withMessage('Invalid reroute reason')
], navigationController.reroute);

/**
 * @swagger
 * /api/navigation/active-trips:
 *   get:
 *     summary: Get user's active trips
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active trips retrieved successfully
 */
router.get('/active-trips', authenticateToken, navigationController.getActiveTrips);

/**
 * @swagger
 * /api/navigation/pause-trip/{tripId}:
 *   post:
 *     summary: Pause an active trip
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               expectedDuration:
 *                 type: number
 *                 description: Expected pause duration in minutes
 *     responses:
 *       200:
 *         description: Trip paused successfully
 */
router.post('/pause-trip/:tripId', [
    authenticateToken,
    body('reason')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Reason must be at most 200 characters'),
    body('expectedDuration')
        .optional()
        .isInt({ min: 1, max: 1440 })
        .withMessage('Expected duration must be between 1 and 1440 minutes')
], navigationController.pauseTrip);

/**
 * @swagger
 * /api/navigation/resume-trip/{tripId}:
 *   post:
 *     summary: Resume a paused trip
 *     tags: [Navigation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip resumed successfully
 */
router.post('/resume-trip/:tripId', authenticateToken, navigationController.resumeTrip);

module.exports = router;
