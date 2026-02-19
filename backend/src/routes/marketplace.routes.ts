import { Router } from 'express';
import * as marketplaceController from '../controllers/marketplace.controller.js';

import { protect } from '../middleware/auth.js';

const router: Router = Router();

// ... existing routes ...

/**
 * @route   POST /api/marketplace/list/:id
 * @desc    List an NFT for rent
 * @access  Private
 */
router.post('/list/:id', protect, marketplaceController.listForRent);



/**
 * @route   GET /api/marketplace
 * @desc    Get all marketplace listings
 * @access  Public
 */
router.get('/', marketplaceController.getAllListings);

/**
 * @route   GET /api/marketplace/search
 * @desc    Search and filter marketplace listings
 * @access  Public
 */
router.get('/search', marketplaceController.searchListings);

/**
 * @route   GET /api/marketplace/trending
 * @desc    Get trending NFTs
 * @access  Public
 */
router.get('/trending', marketplaceController.getTrendingNFTs);

/**
 * @route   GET /api/marketplace/stats
 * @desc    Get marketplace statistics
 * @access  Public
 */
router.get('/stats', marketplaceController.getMarketplaceStats);

/**
 * @route   POST /api/marketplace/listings
 * @desc    Create a new marketplace listing
 * @access  Public (will be protected later)
 */
router.post('/listings', marketplaceController.createListing);

/**
 * @route   DELETE /api/marketplace/listings/:id
 * @desc    Delete a marketplace listing (legacy / admin)
 * @access  Public
 */
router.delete('/listings/:id', marketplaceController.deleteListing);

/**
 * @route   DELETE /api/marketplace/listings/:id/cancel
 * @desc    Cancel (delist) a listing – resets NFT status to available
 * @access  Private (seller only)
 */
router.delete('/listings/:id/cancel', protect, marketplaceController.cancelListing);

export default router;
