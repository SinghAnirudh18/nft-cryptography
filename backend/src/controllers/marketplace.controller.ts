import { Request, Response } from 'express';
import { ListingModel } from '../models/Listing.js';
import { NFTModel } from '../models/NFT.js';
import crypto from 'crypto';

// Pagination helper
function safePaginate(query: any) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
}

/**
 * Get all marketplace listings
 */
export const getAllListings = async (req: Request, res: Response) => {
    try {
        const { page, limit, skip } = safePaginate(req.query);
        const filter: any = { status: 'ACTIVE' };

        const total = await ListingModel.countDocuments(filter);
        const pipeline: any[] = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'nfts',
                    let: { addr: '$tokenAddress', tid: '$tokenId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: [{ $toLower: '$tokenAddress' }, { $toLower: '$$addr' }] },
                                        { $eq: [{ $toString: '$tokenId' }, { $toString: '$$tid' }] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'nft'
                }
            },
            { $unwind: { path: '$nft', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    id: { $ifNull: ['$id', { $toString: '$_id' }] },
                    'nft.isListed': true,
                    'nft.isRented': {
                        $and: [
                            { $ne: ['$nft.expiresAt', null] },
                            { $gt: ['$nft.expiresAt', new Date()] }
                        ]
                    }
                }
            }
        ];

        const listings = await ListingModel.aggregate(pipeline);

        res.status(200).json({
            status: 'success',
            data: listings,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};

/**
 * Create a Listing Draft (Chain-First)
 */
export const createListingDraft = async (req: Request, res: Response) => {
    try {
        const { tokenAddress, tokenId, price, duration } = req.body;
        const userId = ((req as any).user?.id || '').toLowerCase();

        if (!userId) return res.status(401).json({ error: 'Sign in required' });

        const resolvedTokenAddress = tokenAddress.toLowerCase();
        const resolvedTokenId = tokenId.toString();

        // 1. Verify Ownership from indexed facts (Projector's truth)
        const nft = await NFTModel.findOne({
            tokenAddress: resolvedTokenAddress,
            tokenId: resolvedTokenId
        });

        if (!nft) return res.status(404).json({ error: 'NFT not indexed yet. Please wait for sync.' });
        if (nft.owner !== userId) return res.status(403).json({ error: 'Not authorized. You do not own this NFT.' });

        // 2. Prevent duplicate active listings
        const existingListing = await ListingModel.findOne({
            tokenAddress: resolvedTokenAddress,
            tokenId: resolvedTokenId,
            status: { $in: ['LOCAL_DRAFT', 'PENDING_CREATE', 'ACTIVE'] }
        });

        if (existingListing) {
            return res.status(400).json({ error: 'Listing already exists for this NFT' });
        }

        const draftId = `listing_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        const newListing = await ListingModel.create({
            id: draftId,
            tokenAddress: resolvedTokenAddress,
            tokenId: resolvedTokenId,
            sellerAddress: userId, // OWNERSHIP SNAPSHOT
            pricePerDay: price.toString(),
            duration: Number(duration),
            status: 'LOCAL_DRAFT',
            metadataHash: nft.metadataHash
        });

        res.status(201).json({ status: 'success', data: newListing });
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};

/**
 * Notify backend that listing transaction submitted
 */
export const notifyListingTx = async (req: Request, res: Response) => {
    try {
        const { draftId, txHash } = req.body;
        const userId = ((req as any).user?.id || '').toLowerCase();

        const listing = await ListingModel.findOne({ id: draftId });
        if (!listing) return res.status(404).json({ error: 'Draft not found' });
        if (listing.sellerAddress !== userId) return res.status(403).json({ error: 'Not authorized' });

        listing.status = 'PENDING_CREATE';
        listing.txHash = txHash;
        await listing.save();

        res.status(200).json({ status: 'success', data: listing });
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};

/**
 * Cancel Transaction Notify
 */
export const notifyCancelTx = async (req: Request, res: Response) => {
    try {
        const { onChainListingId, txHash } = req.body;
        await ListingModel.updateOne(
            { onChainListingId: Number(onChainListingId) },
            { $set: { status: 'PENDING_CANCEL', txHash } }
        );
        res.status(200).json({ status: 'success', message: 'Cancellation pending' });
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};

// ... other handlers (getTrending, stats)
/**
 * Delete a local draft listing
 */
export const deleteDraftListing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = ((req as any).user?.id || '').toLowerCase();
        const result = await ListingModel.deleteOne({ id, sellerAddress: userId, status: 'LOCAL_DRAFT' });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Draft not found or already submitted' });
        res.status(200).json({ status: 'success', message: 'Draft deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Generate Tx for Cancellation
 */
export const generateCancelTx = async (req: Request, res: Response) => {
    try {
        const { onChainListingId } = req.body;
        // Basic payload generation mockup
        res.status(200).json({ status: 'success', data: { onChainListingId, action: 'cancel' } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Search/Filter Listings
 */
export const searchListings = async (req: Request, res: Response) => {
    return getAllListings(req, res); // Reuse optimized aggregate
};

/**
 * Get Trending NFTs
 */
export const getTrendingNFTs = async (req: Request, res: Response) => {
    try {
        const trending = await NFTModel.find().sort({ views: -1 }).limit(10).lean();
        res.status(200).json({ status: 'success', data: trending });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get Marketplace Stats
 */
export const getMarketplaceStats = async (req: Request, res: Response) => {
    try {
        const totalNFTs = await NFTModel.countDocuments();
        const totalListings = await ListingModel.countDocuments({ status: 'ACTIVE' });
        res.status(200).json({ status: 'success', data: { totalNFTs, totalListings } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};