import mongoose from 'mongoose';

/**
 * Event Ledger (Append-Only)
 * ─────────────────────────────────────────────────────────────────────────────
 * Persists raw logs from the blockchain. This serves as the source of truth
 * for the Projector to derive state (Listings, NFTs, Rentals).
 * 
 * Unique index on { txHash, logIndex } ensures we never ingest the same log twice.
 */

export interface EventRecord extends mongoose.Document {
    txHash: string;
    logIndex: number;
    blockNumber: number;
    contractAddress: string;
    eventName: string;
    args: any;
    status: 'pending' | 'processed' | 'failed';
    retries: number;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const eventSchema = new mongoose.Schema<EventRecord>({
    txHash: { type: String, required: true },
    logIndex: { type: Number, required: true },
    blockNumber: { type: Number, required: true, index: true },
    contractAddress: { type: String, required: true, lowercase: true },
    eventName: { type: String, required: true, index: true },
    args: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending', index: true },
    retries: { type: Number, default: 0 },
    errorMessage: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure we don't ingest duplicates and allow fast ordered processing
eventSchema.index({ txHash: 1, logIndex: 1 }, { unique: true });
eventSchema.index({ blockNumber: 1, logIndex: 1 });

export const EventModel = mongoose.model<EventRecord>('Event', eventSchema);