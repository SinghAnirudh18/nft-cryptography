import { Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import { RentalModel } from '../models/Rental.js';
import { NFTModel } from '../models/NFT.js';

/**
 * Get all rentals
 */
export const getAllRentals = async (req: Request, res: Response) => {
    try {
        const { status, userId } = req.query;

        const filter: any = {};

        // Filter by status
        if (status) {
            filter.status = status;
        }

        // Filter by user (renter or owner)
        if (userId) {
            filter.$or = [
                { renterId: userId },
                { ownerId: userId }
            ];
        }

        const rentals = await RentalModel.find(filter);

        res.status(200).json({
            status: 'success',
            data: rentals,
            message: `Found ${rentals.length} rentals`
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get rental by ID
 */
export const getRentalById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const rental = await RentalModel.findOne({ id: id });

        if (!rental) {
            return res.status(404).json({
                status: 'error',
                error: 'Rental not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: rental
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Create a new rental listing
 */
export const createRental = async (req: Request, res: Response) => {
    try {
        const { nftId, ownerId, rentalPrice, duration } = req.body;

        // Validate required fields
        if (!nftId || !ownerId || !rentalPrice || !duration) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing required fields: nftId, ownerId, rentalPrice, duration'
            });
        }

        // Verify NFT exists and is owned by ownerId
        const nft = await NFTModel.findOne({ id: nftId });
        if (!nft) {
            return res.status(404).json({ status: 'error', error: 'NFT not found' });
        }
        if (nft.owner !== ownerId) {
            return res.status(403).json({ status: 'error', error: 'You do not own this NFT' });
        }

        const newRental = await RentalModel.create({
            id: Date.now().toString(),
            nftId,
            renterId: '', // Will be set when someone rents it
            ownerId,
            rentalPrice,
            currency: 'ETH',
            startDate: new Date(),
            endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000), // duration in days
            status: 'active',
            createdAt: new Date()
        });

        // Update NFT status? Or keep it 'available' until actually rented?
        // Assuming creating a "Rental Listing" implies it's available for rent.
        // If we want to prevent it from being sold while listed for rent, we should change status.
        // For now, let's leave NFT status as is or 'listing' (if we had that enum).
        // Since enum is 'available', 'rented', 'listing' (sale).
        // Let's assume it stays 'available' effectively, or maybe add 'renting_listed'.
        // Sticking to minimal changes for now.

        res.status(201).json({
            status: 'success',
            data: newRental,
            message: 'Rental listing created successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Rent an NFT
 */
export const rentNFT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { renterId, duration } = req.body;

        const rental = await RentalModel.findOne({ id: id });

        if (!rental) {
            return res.status(404).json({
                status: 'error',
                error: 'Rental not found'
            });
        }

        if (rental.status !== 'active' || (rental.renterId && rental.renterId !== '')) {
            return res.status(400).json({
                status: 'error',
                error: 'NFT is not available for rent'
            });
        }

        // Update rental with renter info
        rental.renterId = renterId;
        rental.startDate = new Date();
        rental.endDate = new Date(Date.now() + (duration || 7) * 24 * 60 * 60 * 1000);
        rental.transactionHash = `0x${Math.random().toString(16).substr(2, 40)}`;
        // rental.status remains 'active' until completed? Or 'rented'? 
        // Types say 'active' | 'completed' | 'cancelled'. So 'active' matches.

        await rental.save();

        // Update NFT status to 'rented'
        await NFTModel.findOneAndUpdate({ id: rental.nftId }, { status: 'rented' });

        res.status(200).json({
            status: 'success',
            data: rental,
            message: 'NFT rented successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Return a rented NFT
 */
export const returnNFT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const rental = await RentalModel.findOne({ id: id });

        if (!rental) {
            return res.status(404).json({
                status: 'error',
                error: 'Rental not found'
            });
        }

        if (rental.status !== 'active') {
            return res.status(400).json({
                status: 'error',
                error: 'Rental is not active'
            });
        }

        // Update rental status
        rental.status = 'completed';
        rental.endDate = new Date();
        await rental.save();

        // Update NFT status back to 'available'
        await NFTModel.findOneAndUpdate({ id: rental.nftId }, { status: 'available' });

        res.status(200).json({
            status: 'success',
            data: rental,
            message: 'NFT returned successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get active rentals
 */
export const getActiveRentals = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        const filter: any = { status: 'active' };

        // Filter by user if provided
        if (userId) {
            filter.$or = [
                { renterId: userId },
                { ownerId: userId }
            ];
        }

        const activeRentals = await RentalModel.find(filter);

        res.status(200).json({
            status: 'success',
            data: activeRentals,
            message: `Found ${activeRentals.length} active rentals`
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get rental history
 */
export const getRentalHistory = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        const filter: any = {
            status: { $in: ['completed', 'cancelled'] }
        };

        // Filter by user if provided
        if (userId) {
            filter.$or = [
                { renterId: userId },
                { ownerId: userId }
            ];
        }

        const history = await RentalModel.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            data: history,
            message: `Found ${history.length} rental records`
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};
