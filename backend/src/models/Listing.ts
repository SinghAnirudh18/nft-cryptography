import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
    // -------- AUTHORITATIVE IDENTITY (BLOCKCHAIN TRUTH) --------
    onChainListingId: { type: Number, index: true },
    tokenAddress: { type: String, required: true, lowercase: true, index: true },
    tokenId: { type: String, required: true, index: true },

    // -------- OWNERSHIP SNAPSHOT (MARKETPLACE CORRECTNESS) --------
    sellerAddress: { type: String, required: true, lowercase: true, index: true },

    // -------- DATA --------
    pricePerDay: { type: String, required: true },
    minDuration: { type: Number, default: 1 },
    maxDuration: { type: Number },
    metadataHash: { type: String },

    // -------- STATE --------
    status: {
        type: String,
        enum: ['LOCAL_DRAFT', 'PENDING_CREATE', 'ACTIVE', 'PENDING_CANCEL', 'CANCELLED', 'RENTED', 'LEGACY_ARCHIVED'],
        default: 'LOCAL_DRAFT',
        index: true
    },

    txHash: { type: String },
    blockNumber: { type: Number },
    confirmedAt: { type: Date },

    // -------- ANALYTICS --------
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },

    // App internal linking
    id: { type: String, unique: true },
    nftId: { type: String }, // Legacy DB ID for frontend compat if needed
}, {
    timestamps: true
});

/**
 * PREVENT STALE LISTINGS
 * Ensure only one ACTIVE listing exists per NFT+Seller combination.
 */
listingSchema.index(
    { tokenAddress: 1, tokenId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: 'ACTIVE' }
    }
);

export const ListingModel = mongoose.model('Listing', listingSchema);