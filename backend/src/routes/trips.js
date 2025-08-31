const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Trip:
 *       type: object
 *       required:
 *         - title
 *         - destination
 *       properties:
 *         title:
 *           type: string
 *           description: Trip title
 *         destination:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *         waypoints:
 *           type: array
 *           items:
 *             type: object
 *         status:
 *           type: string
 *           enum: [draft, planned, in_progress, completed, cancelled]
 */

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Get user trips
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter trips by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of trips to return
 *     responses:
 *       200:
 *         description: Trips retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', 
    authenticateToken,
    [
        query('status').optional().isIn(['draft', 'planned', 'in_progress', 'completed', 'cancelled']),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    async (req, res) => {
        // Trip controller would be implemented here
        res.json({
            success: true,
            message: 'Get trips endpoint - to be implemented',
            data: []
        });
    }
);

/**
 * @swagger
 * /api/trips:
 *   post:
 *     summary: Create new trip
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trip'
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',
    authenticateToken,
    [
        body('title').notEmpty().trim().isLength({ min: 3, max: 100 }),
        body('destination.name').notEmpty().trim(),
        body('destination.latitude').isFloat({ min: -90, max: 90 }),
        body('destination.longitude').isFloat({ min: -180, max: 180 })
    ],
    async (req, res) => {
        // Trip controller would be implemented here
        res.json({
            success: true,
            message: 'Create trip endpoint - to be implemented',
            data: { tripId: 'placeholder' }
        });
    }
);

/**
 * @swagger
 * /api/trips/{tripId}:
 *   get:
 *     summary: Get trip by ID
 *     tags: [Trips]
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
 *         description: Trip retrieved successfully
 *       404:
 *         description: Trip not found
 */
router.get('/:tripId',
    authenticateToken,
    [
        param('tripId').isMongoId()
    ],
    async (req, res) => {
        // Trip controller would be implemented here
        res.json({
            success: true,
            message: 'Get trip by ID endpoint - to be implemented',
            data: null
        });
    }
);

/**
 * @swagger
 * /api/trips/{tripId}:
 *   put:
 *     summary: Update trip
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trip'
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       404:
 *         description: Trip not found
 */
router.put('/:tripId',
    authenticateToken,
    [
        param('tripId').isMongoId(),
        body('title').optional().trim().isLength({ min: 3, max: 100 })
    ],
    async (req, res) => {
        // Trip controller would be implemented here
        res.json({
            success: true,
            message: 'Update trip endpoint - to be implemented',
            data: null
        });
    }
);

/**
 * @swagger
 * /api/trips/{tripId}:
 *   delete:
 *     summary: Delete trip
 *     tags: [Trips]
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
 *         description: Trip deleted successfully
 *       404:
 *         description: Trip not found
 */
router.delete('/:tripId',
    authenticateToken,
    [
        param('tripId').isMongoId()
    ],
    async (req, res) => {
        // Trip controller would be implemented here
        res.json({
            success: true,
            message: 'Delete trip endpoint - to be implemented'
        });
    }
);

module.exports = router;
