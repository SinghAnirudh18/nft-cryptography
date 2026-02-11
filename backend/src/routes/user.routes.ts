import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.js';

const router: Router = Router();

/**
 * @route   GET /api/users/:id/stats
 * @desc    Get user statistics
 * @access  Public
 */
router.get('/:id/stats', userController.getUserStats);

/**
 * @route   GET /api/users/:id/owned
 * @desc    Get user's owned NFTs
 * @access  Public
 */
router.get('/:id/owned', userController.getOwnedNFTs);

/**
 * @route   GET /api/users/:id/rented
 * @desc    Get user's rented NFTs
 * @access  Public
 */
router.get('/:id/rented', userController.getRentedNFTs);

/**
 * @route   GET /api/users/:id/listings
 * @desc    Get user's active listings
 * @access  Public
 */
router.get('/:id/listings', userController.getUserListings);

/**
 * @route   GET /api/users/:id/profile
 * @desc    Get user profile
 * @access  Public
 */
router.get('/:id/profile', userController.getUserProfile);

/**
 * @route   PUT /api/users/:id/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/:id/profile', protect, userController.updateUserProfile);

/**
 * @route   GET /api/users/:id/history
 * @desc    Get user's past rental history (as renter)
 * @access  Public
 */
router.get('/:id/history', userController.getRentalHistory);

/**
 * @route   GET /api/users/:id/earnings
 * @desc    Get user's earnings history (as owner)
 * @access  Public
 */
router.get('/:id/earnings', userController.getEarningsHistory);

export default router;
