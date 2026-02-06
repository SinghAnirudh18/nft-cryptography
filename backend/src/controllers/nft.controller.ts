import { Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import { NFTModel } from '../models/NFT.js';

/**
 * Get all NFTs
 */
export const getAllNFTs = async (req: Request, res: Response) => {
    try {
        const { status, collection, minPrice, maxPrice } = req.query;

        const filter: any = {};

        // Filter by status
        if (status) {
            filter.status = status;
        }

        // Filter by collection
        if (collection) {
            filter.collection = { $regex: collection, $options: 'i' };
        }

        // Filter by price range
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = minPrice; // Note: Stored as string, comparison might be tricky without casting.Ideally store as number.
            if (maxPrice) filter.price.$lte = maxPrice;
        }

        const filteredNFTs = await NFTModel.find(filter);

        const response: ApiResponse<any[]> = {
            status: 'success',
            data: filteredNFTs,
            message: `Found ${filteredNFTs.length} NFTs`
        };

        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get NFT by ID
 */
export const getNFTById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const nft = await NFTModel.findOne({ id: id });

        if (!nft) {
            return res.status(404).json({
                status: 'error',
                error: 'NFT not found'
            });
        }

        // Increment views
        nft.views = (nft.views || 0) + 1;
        await nft.save();

        const response: ApiResponse<any> = {
            status: 'success',
            data: nft
        };

        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Create new NFT
 */
export const createNFT = async (req: Request, res: Response) => {
    try {
        const newNFT = await NFTModel.create({
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const response: ApiResponse<any> = {
            status: 'success',
            data: newNFT,
            message: 'NFT created successfully'
        };

        res.status(201).json(response);
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Update NFT
 */
export const updateNFT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const nft = await NFTModel.findOneAndUpdate(
            { id: id },
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );

        if (!nft) {
            return res.status(404).json({
                status: 'error',
                error: 'NFT not found'
            });
        }

        const response: ApiResponse<any> = {
            status: 'success',
            data: nft,
            message: 'NFT updated successfully'
        };

        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Delete NFT
 */
export const deleteNFT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedNFT = await NFTModel.findOneAndDelete({ id: id });

        if (!deletedNFT) {
            return res.status(404).json({
                status: 'error',
                error: 'NFT not found'
            });
        }

        const response: ApiResponse<any> = {
            status: 'success',
            data: deletedNFT,
            message: 'NFT deleted successfully'
        };

        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};

/**
 * Get NFTs by user
 */
export const getNFTsByUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const userNFTs = await NFTModel.find({ owner: userId });

        const response: ApiResponse<any[]> = {
            status: 'success',
            data: userNFTs,
            message: `Found ${userNFTs.length} NFTs for user ${userId}`
        };

        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
};
