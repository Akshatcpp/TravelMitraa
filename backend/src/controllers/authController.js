const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Reward = require('../models/Reward');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Generate JWT Token
 */
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * Register new user
 */
const register = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, password, fullName, phone } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email.toLowerCase() 
                    ? 'Email already registered' 
                    : 'Username already taken'
            });
        }

        // Create new user
        const user = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,
            fullName,
            phone
        });

        await user.save();

        // Award welcome bonus
        const welcomeReward = new Reward({
            userId: user._id,
            type: 'milestone_reached',
            points: 50,
            description: 'Welcome to Mappls Navigation! Bonus for joining.',
            metadata: {
                category: 'welcome',
                rarity: 'common'
            }
        });

        await welcomeReward.save();

        // Update user points
        const rewardUpdate = user.addRewardPoints(50, 'Welcome bonus');
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        logger.info(`New user registered: ${user.email}`);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: user.toSafeObject(),
                welcomeReward: rewardUpdate
            }
        });

    } catch (error) {
        logger.error('Registration error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Login user
 */
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is active
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

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update login streak and award daily login bonus
        const loginStreak = user.updateLoginStreak();
        let dailyLoginReward = null;

        // Award daily login bonus
        const today = new Date().toDateString();
        const lastLoginDate = user.lastLoginAt ? user.lastLoginAt.toDateString() : null;

        if (lastLoginDate !== today) {
            const dailyBonus = process.env.DAILY_LOGIN_REWARD || 5;
            const streakBonus = Math.min(loginStreak, 7) * 2; // Up to 14 bonus points for 7-day streak
            const totalBonus = parseInt(dailyBonus) + streakBonus;

            const rewardUpdate = user.addRewardPoints(totalBonus, 'Daily login bonus');
            
            dailyLoginReward = new Reward({
                userId: user._id,
                type: 'daily_login',
                points: totalBonus,
                description: `Daily login bonus (+${streakBonus} streak bonus)`,
                metadata: {
                    category: 'daily',
                    loginStreak: loginStreak
                }
            });

            await dailyLoginReward.save();
            await user.save();
        }

        // Generate token
        const token = generateToken(user._id);

        logger.info(`User logged in: ${user.email}, streak: ${loginStreak}`);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: user.toSafeObject(),
                loginStreak,
                dailyReward: dailyLoginReward ? {
                    points: dailyLoginReward.points,
                    description: dailyLoginReward.description
                } : null
            }
        });

    } catch (error) {
        logger.error('Login error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get recent rewards
        const recentRewards = await Reward.getUserRewards(user._id, 5);
        
        // Get user statistics
        const stats = await Reward.getUserRewardSummary(user._id);

        res.json({
            success: true,
            data: {
                user: user.toSafeObject(),
                recentRewards,
                statistics: stats[0] || {
                    totalPoints: user.rewardPoints,
                    totalRewards: 0,
                    breakdown: []
                }
            }
        });

    } catch (error) {
        logger.error('Get profile error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const updates = req.body;
        const allowedUpdates = [
            'fullName', 'phone', 'defaultLocation', 'preferences', 'privacy'
        ];

        // Filter out non-allowed updates
        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.userId,
            filteredUpdates,
            { new: true, runValidators: true }
        ).select('-password');

        logger.info(`Profile updated for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.toSafeObject()
            }
        });

    } catch (error) {
        logger.error('Update profile error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        logger.info(`Password changed for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Change password error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;

        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify password for account deletion
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Password is incorrect'
            });
        }

        // Soft delete - deactivate account instead of hard delete
        user.isActive = false;
        user.email = `deleted_${Date.now()}_${user.email}`;
        await user.save();

        logger.info(`Account deleted for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        logger.error('Delete account error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account'
        });
    }
};

/**
 * Refresh token
 */
const refreshToken = async (req, res) => {
    try {
        // Get current user from middleware
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate new token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token,
                user: user.toSafeObject()
            }
        });

    } catch (error) {
        logger.error('Refresh token error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token'
        });
    }
};

/**
 * Get user statistics
 */
const getStatistics = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get detailed reward statistics
        const rewardStats = await Reward.getUserRewardSummary(user._id);
        
        // Get leaderboard position
        const leaderboard = await Reward.getLeaderboard('all', 100);
        const userPosition = leaderboard.findIndex(entry => 
            entry._id.toString() === user._id.toString()
        ) + 1;

        res.json({
            success: true,
            data: {
                user: user.toSafeObject(),
                statistics: rewardStats[0] || {
                    totalPoints: user.rewardPoints,
                    totalRewards: 0,
                    breakdown: []
                },
                leaderboardPosition: userPosition || 'Not ranked',
                achievements: {
                    badges: user.badges.length,
                    level: user.level,
                    nextLevelPoints: user.nextLevelPoints
                }
            }
        });

    } catch (error) {
        logger.error('Get statistics error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
};

/**
 * Upload profile picture
 */
const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update profile picture URL
        const imageUrl = `/uploads/profiles/${req.file.filename}`;
        user.profilePicture = imageUrl;
        await user.save();

        logger.info(`Profile picture updated for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            data: {
                profilePicture: imageUrl
            }
        });

    } catch (error) {
        logger.error('Upload profile picture error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture'
        });
    }
};

/**
 * Set default location
 */
const setDefaultLocation = async (req, res) => {
    try {
        const { name, latitude, longitude, address } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.defaultLocation = {
            name: name || 'My Location',
            latitude,
            longitude,
            address: address || ''
        };

        await user.save();

        logger.info(`Default location set for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Default location set successfully',
            data: {
                defaultLocation: user.defaultLocation
            }
        });

    } catch (error) {
        logger.error('Set default location error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to set default location'
        });
    }
};

/**
 * Get user achievements and badges
 */
const getAchievements = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('badges achievements level rewardPoints');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check for new achievements
        const newAchievements = await checkForNewAchievements(user);

        res.json({
            success: true,
            data: {
                level: user.level,
                currentPoints: user.rewardPoints,
                nextLevelPoints: user.nextLevelPoints,
                badges: user.badges,
                achievements: user.achievements,
                newAchievements
            }
        });

    } catch (error) {
        logger.error('Get achievements error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch achievements'
        });
    }
};

/**
 * Check for new achievements
 */
const checkForNewAchievements = async (user) => {
    const newAchievements = [];
    
    // Check point milestones
    const pointMilestones = [100, 500, 1000, 2500, 5000, 10000];
    
    for (const milestone of pointMilestones) {
        if (user.rewardPoints >= milestone) {
            const achievementExists = user.achievements.find(ach => 
                ach.type === `points_${milestone}`
            );
            
            if (!achievementExists) {
                const achievement = {
                    type: `points_${milestone}`,
                    unlockedAt: new Date(),
                    points: milestone / 10 // Bonus points for achievement
                };
                
                user.achievements.push(achievement);
                newAchievements.push(achievement);
            }
        }
    }

    // Check travel distance milestones
    const distanceMilestones = [100, 500, 1000, 5000]; // km
    
    for (const milestone of distanceMilestones) {
        if (user.travelStats.totalDistance >= milestone * 1000) { // Convert to meters
            const achievementExists = user.achievements.find(ach => 
                ach.type === `distance_${milestone}km`
            );
            
            if (!achievementExists) {
                const achievement = {
                    type: `distance_${milestone}km`,
                    unlockedAt: new Date(),
                    points: milestone / 5 // Bonus points
                };
                
                user.achievements.push(achievement);
                newAchievements.push(achievement);
            }
        }
    }

    // Save user if new achievements were added
    if (newAchievements.length > 0) {
        await user.save();
    }

    return newAchievements;
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    refreshToken,
    getStatistics,
    uploadProfilePicture,
    setDefaultLocation,
    getAchievements
};
