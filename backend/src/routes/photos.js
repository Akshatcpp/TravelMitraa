const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/photos/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Photo:
 *       type: object
 *       properties:
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *         arData:
 *           type: object
 *         qualityScore:
 *           type: number
 *         rewardPoints:
 *           type: integer
 */

/**
 * @swagger
 * /api/photos:
 *   get:
 *     summary: Get user photos
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of photos to return
 *     responses:
 *       200:
 *         description: Photos retrieved successfully
 */
router.get('/',
    authenticateToken,
    [
        query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    async (req, res) => {
        res.json({
            success: true,
            message: 'Get photos endpoint - to be implemented',
            data: {
                photos: [],
                count: 0
            }
        });
    }
);

/**
 * @swagger
 * /api/photos/upload:
 *   post:
 *     summary: Upload live photo with AR data
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               arData:
 *                 type: string
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *       400:
 *         description: Invalid photo or data
 */
router.post('/upload',
    authenticateToken,
    upload.single('photo'),
    [
        body('latitude').isFloat({ min: -90, max: 90 }),
        body('longitude').isFloat({ min: -180, max: 180 }),
        body('arData').optional().isJSON()
    ],
    async (req, res) => {
        res.json({
            success: true,
            message: 'Upload photo endpoint - to be implemented',
            data: {
                photoId: 'placeholder',
                rewardPoints: 50
            }
        });
    }
);

/**
 * @swagger
 * /api/photos/{photoId}:
 *   get:
 *     summary: Get photo by ID
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo retrieved successfully
 *       404:
 *         description: Photo not found
 */
router.get('/:photoId',
    authenticateToken,
    [
        param('photoId').isMongoId()
    ],
    async (req, res) => {
        res.json({
            success: true,
            message: 'Get photo by ID endpoint - to be implemented',
            data: null
        });
    }
);

/**
 * @swagger
 * /api/photos/{photoId}/like:
 *   post:
 *     summary: Like/unlike photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo liked/unliked successfully
 */
router.post('/:photoId/like',
    authenticateToken,
    [
        param('photoId').isMongoId()
    ],
    async (req, res) => {
        res.json({
            success: true,
            message: 'Like photo endpoint - to be implemented',
            data: null
        });
    }
);

/**
 * @swagger
 * /api/photos/nearby:
 *   get:
 *     summary: Get nearby photos
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
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
 *           type: integer
 *         description: Radius in meters
 *     responses:
 *       200:
 *         description: Nearby photos retrieved successfully
 */
router.get('/nearby',
    authenticateToken,
    [
        query('latitude').isFloat({ min: -90, max: 90 }),
        query('longitude').isFloat({ min: -180, max: 180 }),
        query('radius').optional().isInt({ min: 100, max: 10000 })
    ],
    async (req, res) => {
        res.json({
            success: true,
            message: 'Get nearby photos endpoint - to be implemented',
            data: {
                photos: [],
                count: 0
            }
        });
    }
);

module.exports = router;
