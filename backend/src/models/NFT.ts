import mongoose from 'mongoose';
import { NFT } from '../types/index.js';

const nftSchema = new mongoose.Schema<NFT>({
    // -------- AUTHORITATIVE IDENTITY (BLOCKCHAIN TRUTH) --------
    tokenAddress: { type: String, required: true, lowercase: true, index: true },
    tokenId: { type: String, required: true, index: true },

    // -------- METADATA (CACHED FROM CHAIN/IPFS) --------
    name: { type: String },
    description: { type: String },
    image: { type: String },
    collectionName: { type: String, default: 'DAO Collection' },

    creator: { type: String, lowercase: true },
    owner: { type: String, lowercase: true }, // Current blockchain owner

    tokenURI: { type: String },
    metadataHash: { type: String },

    // -------- CHAIN DATA --------
    mintTxHash: { type: String },
    blockNumber: { type: Number },

    // -------- RENTAL STATE (FACT-BASED) --------
    renter: { type: String, lowercase: true, default: null },
    expiresAt: { type: Date, default: null },

    // -------- ANALYTICS/SOCIAL --------
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },

    // -------- INTERNAL APP REFERENCE --------
    // Legacy support or internal linking only. Not used for identity verification.
    id: { type: String },
}, {
    timestamps: true
});

/**
 * AUTHORITATIVE IDENTITY INDEX
 */
nftSchema.index({ tokenAddress: 1, tokenId: 1 }, { unique: true });

export const NFTModel = mongoose.model<NFT>('NFT', nftSchema);