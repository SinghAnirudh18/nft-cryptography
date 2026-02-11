import { Request, Response } from 'express';
import { UserStats, ApiResponse } from '../types/index.js';
import { UserModel } from '../models/User.js';
import { NFTModel } from '../models/NFT.js';
import { RentalModel } from '../models/Rental.js';

/**
 * Get user statistics
 */
export const getUserStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get user's NFTs
        const userNFTs = await NFTModel.find({ owner: id });

        // Calculate total value
        const totalValue = userNFTs.reduce((sum, nft) => sum + (nft.price || 0), 0);

        // Count active listings (NFTs available for rent)
        const activeListings = userNFTs.filter(nft => nft.status === 'available').length;

        // Active Rentals (as Tenant)
        const activeRentalsCount = await RentalModel.countDocuments({
            renterId: id,
            status: 'active'
        });

        // Total Earnings (as Landlord)
        const ownerRentals = await RentalModel.find({ ownerId: id });
        const totalEarnings = ownerRentals.reduce((sum, rental) => sum + (rental.rentalPrice || 0), 0);

        // Active Rentals (as Landlord) - items currently rented OUT
        const activeRentedOutCount = await RentalModel.countDocuments({
            ownerId: id,
            status: 'active'
        });

        const stats: UserStats = {
            totalNFTs: userNFTs.length,
            totalValue: totalValue.toFixed(2),
            activeListings,
            totalRentals: activeRentalsCount, // Active rentals as user (tenant)
            totalEarnings: totalEarnings.toFixed(4),
            activeRentedOut: activeRentedOutCount,
            currency: 'ETH'
        };

        res.status(200).json({
            status: 'success',
            data: stats
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get user's owned NFTs
 */
export const getOwnedNFTs = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const ownedNFTs = await NFTModel.find({ owner: id });

        res.status(200).json({
            status: 'success',
            data: ownedNFTs,
            message: `Found ${ownedNFTs.length} owned NFTs`
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get user's rented NFTs (Items user is renting from others)
 */
export const getRentedNFTs = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find active rentals where user is renter
        // We need to also fetch the NFT details. 
        // In a real app, populate() would work if refs are set up correctly.
        // Here we'll do a two-step lookup if specific populate is tricky with current schema/types.

        const activeRentals = await RentalModel.find({
            renterId: id,
            status: 'active'
        });

        const nftIds = activeRentals.map(r => r.nftId);
        const nfts = await NFTModel.find({ id: { $in: nftIds } });

        // Merge rental info (endDate) into NFT object for frontend display
        const enrichedNFTs = nfts.map(nft => {
            const rental = activeRentals.find(r => r.nftId === nft.id);
            return {
                ...nft.toObject(),
                rentalEndDate: rental?.endDate,
                timeLeft: rental ? calculateTimeLeft(rental.endDate) : 'Expired'
            };
        });

        res.status(200).json({
            status: 'success',
            data: enrichedNFTs,
            message: `Found ${enrichedNFTs.length} rented NFTs`
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get user's active listings
 */
export const getUserListings = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get user's NFTs that are listed
        const userListings = await NFTModel.find({
            owner: id,
            status: 'available'
        });

        // For compatibility with frontend "Listings" model, we map it
        // Or just return the NFTs directly since they have price info
        res.status(200).json({
            status: 'success',
            data: userListings.map(nft => ({
                id: nft.id + '_listing', // mock listing ID
                nft: nft,
                price: nft.price,
                rentalPrice: nft.rentalPrice || (nft.price ? nft.price * 0.1 : 0),
                duration: 7 // default mock
            })),
            message: `Found ${userListings.length} active listings`
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get User Rental History (Items user rented in past)
 */
export const getRentalHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const history = await RentalModel.find({ renterId: id }).sort({ createdAt: -1 });

        // Populate NFT names/images manually or via populate
        // Doing manual for safety with current schema
        const nftIds = history.map(r => r.nftId);
        const nfts = await NFTModel.find({ id: { $in: nftIds } }); // mapping by custom id

        const richHistory = history.map(rental => {
            const nft = nfts.find(n => n.id === rental.nftId);
            return {
                id: rental._id,
                nftName: nft?.name || 'Unknown NFT',
                nftImage: nft?.image,
                startDate: rental.startDate,
                endDate: rental.endDate,
                price: rental.rentalPrice,
                status: rental.status
            };
        });

        res.status(200).json({
            status: 'success',
            data: richHistory
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get User Earnings History (Items user rented OUT)
 */
export const getEarningsHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const earnings = await RentalModel.find({ ownerId: id }).sort({ createdAt: -1 });

        const richEarnings = earnings.map(rental => ({
            id: rental._id,
            nftId: rental.nftId, // could populate name
            renterId: rental.renterId, // could populate username
            amount: rental.rentalPrice,
            date: rental.createdAt,
            status: rental.status
        }));

        res.status(200).json({
            status: 'success',
            data: richEarnings
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get user profile
 */
export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await UserModel.findOne({ id: id });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const user = await UserModel.findOneAndUpdate(
            { id: id },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: user,
            message: 'Profile updated successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

// Helper: Calculate time left string
function calculateTimeLeft(endDate: Date): string {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h left`;
}


