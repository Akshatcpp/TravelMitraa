const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user and check if account is active
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        if (user.isBlocked) {
            return res.status(401).json({
                success: false,
                message: 'Account is blocked',
                reason: user.blockReason
            });
        }

        // Update last active time
        user.lastActiveAt = new Date();
        await user.save();

        // Attach user to request
        req.user = user;
        req.userId = user._id;
        
        next();
    } catch (error) {
        logger.error('Authentication error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access token has expired'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Optional Authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user && user.isActive && !user.isBlocked) {
                req.user = user;
                req.userId = user._id;
                
                // Update last active time
                user.lastActiveAt = new Date();
                await user.save();
            }
        }
        
        next();
    } catch (error) {
        // Silently continue without authentication
        next();
    }
};

/**
 * Admin Role Check Middleware
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    next();
};

/**
 * Rate Limiting by User
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const userId = req.userId?.toString() || req.ip;
        const now = Date.now();
        
        if (!requests.has(userId)) {
            requests.set(userId, []);
        }
        
        const userRequests = requests.get(userId);
        
        // Remove old requests outside the window
        while (userRequests.length > 0 && userRequests[0] < now - windowMs) {
            userRequests.shift();
        }
        
        if (userRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        userRequests.push(now);
        next();
    };
};

/**
 * Check if user owns resource
 */
const checkResourceOwnership = (resourceIdParam = 'id', resourceModel = null) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const resourceId = req.params[resourceIdParam];
            
            if (resourceModel) {
                const resource = await resourceModel.findById(resourceId);
                
                if (!resource) {
                    return res.status(404).json({
                        success: false,
                        message: 'Resource not found'
                    });
                }
                
                if (resource.userId.toString() !== req.userId.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                }
                
                req.resource = resource;
            }
            
            next();
        } catch (error) {
            logger.error('Resource ownership check error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

/**
 * Validate API Key for external integrations
 */
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API key is required'
        });
    }

    // In production, validate against database of valid API keys
    // For now, simple validation
    if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Invalid API key'
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireAdmin,
    userRateLimit,
    checkResourceOwnership,
    validateApiKey
};
