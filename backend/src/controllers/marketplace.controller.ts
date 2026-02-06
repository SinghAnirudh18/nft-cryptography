import { Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import { ListingModel } from '../models/Listing.js';
import { NFTModel } from '../models/NFT.js';

/**
 * Get all marketplace listings
 */
export const getAllListings = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, status = 'active' } = req.query;

        const filter: any = {};
        if (status) filter.status = status;

        const total = await ListingModel.countDocuments(filter);

        const listings = await ListingModel.find(filter)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        // Enrich with NFT data
        const enrichedListings = await Promise.all(listings.map(async (listing) => {
            const nft = await NFTModel.findOne({ id: listing.nftId });
            return {
                ...listing.toObject(),
                nft
            };
        }));

        res.status(200).json({
            status: 'success',
            data: enrichedListings,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: total,
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Search marketplace listings
 */
export const searchListings = async (req: Request, res: Response) => {
    try {
        const { query, category, minPrice, maxPrice, sortBy = 'trending' } = req.query;

        // Start with basic listing filters (price, status)
        const matchStage: any = { status: 'active' };

        // Price filter on listing itself
        if (minPrice || maxPrice) {
            matchStage.price = {};
            if (minPrice) matchStage.price.$gte = minPrice; // Note: String comparison limitation
            if (maxPrice) matchStage.price.$lte = maxPrice;
        }

        // Aggregation to join NFT data and filter/sort
        const pipeline: any[] = [
            { $match: matchStage },
            // Lookup based on custom 'id' field vs 'nftId'
            {
                $lookup: {
                    from: 'nfts',
                    localField: 'nftId',
                    foreignField: 'id',
                    as: 'nft'
                }
            },
            { $unwind: '$nft' } // Only keep listings with valid NFTs
        ];

        // Search query filter (requires NFT data)
        if (query) {
            const searchRegex = new RegExp(query as string, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { 'nft.name': searchRegex },
                        { 'nft.collection': searchRegex }
                    ]
                }
            });
        }

        // Sort
        let sortStage: any = {};
        if (sortBy === 'price_asc') sortStage.price = 1;
        else if (sortBy === 'price_desc') sortStage.price = -1;
        else if (sortBy === 'trending') sortStage.views = -1;
        else sortStage.createdAt = -1;

        if (Object.keys(sortStage).length > 0) {
            pipeline.push({ $sort: sortStage });
        }

        const results = await ListingModel.aggregate(pipeline);

        res.status(200).json({
            status: 'success',
            data: results,
            message: `Found ${results.length} listings`
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get trending NFTs
 */
export const getTrendingNFTs = async (req: Request, res: Response) => {
    try {
        const { limit = 10 } = req.query;

        // Custom scoring for trending (views + likes*2)
        const trending = await ListingModel.aggregate([
            { $match: { status: 'active' } },
            {
                $addFields: {
                    score: { $add: ['$views', { $multiply: ['$likes', 2] }] }
                }
            },
            { $sort: { score: -1 } },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: 'nfts',
                    localField: 'nftId',
                    foreignField: 'id',
                    as: 'nft'
                }
            },
            { $unwind: '$nft' }
        ]);

        res.status(200).json({
            status: 'success',
            data: trending
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get marketplace statistics
 */
export const getMarketplaceStats = async (req: Request, res: Response) => {
    try {
        const stats = await ListingModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalListings: { $sum: 1 },
                    activeListings: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: '$likes' }
                    // Note: Summing price strings requires casting, omitted for prototype safety
                }
            }
        ]);

        const result = stats[0] || { totalListings: 0, activeListings: 0, totalViews: 0, totalLikes: 0 };

        res.status(200).json({
            status: 'success',
            data: { ...result, currency: 'ETH' }
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Create a new listing
 */
export const createListing = async (req: Request, res: Response) => {
    try {
        const newListing = await ListingModel.create({
            id: Date.now().toString(),
            ...req.body,
            status: 'active',
            views: 0,
            likes: 0,
            createdAt: new Date()
        });

        // Also update NFT status?
        // await NFTModel.updateOne({ id: req.body.nftId }, { status: 'listed' });

        res.status(201).json({
            status: 'success',
            data: newListing,
            message: 'Listing created successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Delete a listing
 */
export const deleteListing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedListing = await ListingModel.findOneAndDelete({ id: id });

        if (!deletedListing) {
            return res.status(404).json({
                status: 'error',
                error: 'Listing not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: deletedListing,
            message: 'Listing deleted successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};
