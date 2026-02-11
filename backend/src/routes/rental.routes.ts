import { Router } from 'express';
import * as rentalController from '../controllers/rental.controller.js';

import { protect } from '../middleware/auth.js';

const router: Router = Router();

// ... existing routes ...

/**
 * @route   POST /api/rentals/rent
 * @desc    Rent an NFT (from Listing)
 * @access  Private
 */
router.post('/rent', protect, rentalController.rentFromListing as any);

/**
 * @route   POST /api/rentals/:id/rent
 * @desc    Rent an NFT (Legacy/Direct)
 * @access  Public (will be protected later)
 */
router.post('/:id/rent', rentalController.rentNFT as any);

/**
 * @route   PUT /api/rentals/return/:nftId
 * @desc    Return a rented NFT (by NFT ID)
 * @access  Private
 */
router.put('/return/:nftId', protect, rentalController.returnNFTByNFTId as any);


/**
 * @route   GET /api/rentals/active
 * @desc    Get active rentals
 * @access  Public
 */
router.get('/active/list', rentalController.getActiveRentals as any);

/**
 * @route   GET /api/rentals/history
 * @desc    Get rental history
 * @access  Public
 */
router.get('/history/list', rentalController.getRentalHistory as any);

export default router;
