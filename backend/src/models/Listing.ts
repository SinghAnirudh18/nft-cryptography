import mongoose from 'mongoose';
import { Listing } from '../types/index.js';

const listingSchema = new mongoose.Schema<Listing>({
    id: { type: String, required: true, unique: true },
    nftId: { type: String, required: true, ref: 'NFT' },
    sellerId: { type: String, required: true, ref: 'User' },
    price: { type: String, required: true },
    rentalPrice: { type: String },
    currency: { type: String, required: true },
    duration: { type: Number },
    status: { type: String, enum: ['active', 'sold', 'cancelled'], default: 'active' },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export const ListingModel = mongoose.model<Listing>('Listing', listingSchema);
