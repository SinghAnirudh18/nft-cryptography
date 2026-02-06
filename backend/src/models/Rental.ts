import mongoose from 'mongoose';
import { Rental } from '../types/index.js';

const rentalSchema = new mongoose.Schema<Rental>({
    id: { type: String, required: true, unique: true },
    nftId: { type: String, required: true, ref: 'NFT' },
    renterId: { type: String, required: true, ref: 'User' },
    ownerId: { type: String, required: true, ref: 'User' },
    rentalPrice: { type: String, required: true },
    currency: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    transactionHash: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export const RentalModel = mongoose.model<Rental>('Rental', rentalSchema);
