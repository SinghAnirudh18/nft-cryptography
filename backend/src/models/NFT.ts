import mongoose from 'mongoose';
import { NFT } from '../types/index.js';

const nftSchema = new mongoose.Schema<NFT>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String, required: true },
    owner: { type: String, required: true, ref: 'User' }, // Reference to User ID
    collection: { type: String, required: true },
    creator: { type: String, required: true },
    price: { type: String, required: true },
    rentalPrice: { type: String, required: true },
    currency: { type: String, default: 'ETH' },
    status: { type: String, enum: ['available', 'rented', 'listing'], default: 'available' },
    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    timeLeft: { type: String },
    rentalEndDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const NFTModel = mongoose.model<NFT>('NFT', nftSchema);
