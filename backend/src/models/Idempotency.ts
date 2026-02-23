/**
 * Idempotency.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Persists Idempotency-Key → result mappings so that duplicate HTTP requests
 * (network retries, double-clicks, tab refreshes) do not create duplicate DB
 * records or fire duplicate on-chain notifications.
 *
 * Schema:
 *   key        — the Idempotency-Key header value (UUID)
 *   endpoint   — which endpoint processed this key (for debugging)
 *   userId     — the authenticated user who sent it
 *   txHash     — the transaction hash associated with the idempotent call
 *   statusCode — the HTTP status code of the original response
 *   result     — the full original response body (returned on replay)
 *   createdAt  — TTL field: auto-expire after 7 days
 */

import mongoose from 'mongoose';

export interface IdempotencyRecord extends mongoose.Document {
    key: string;
    endpoint: string;
    userId: string;
    txHash?: string;
    statusCode: number;
    result: any;
    createdAt: Date;
}

const idempotencySchema = new mongoose.Schema<IdempotencyRecord>({
    key: { type: String, required: true, unique: true },
    endpoint: { type: String, required: true },
    userId: { type: String, required: true },
    txHash: { type: String },
    statusCode: { type: Number, required: true },
    result: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

// Auto-expire after 7 days (604800 seconds)
idempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
idempotencySchema.index({ txHash: 1 }); // fast lookup by txHash for dedup

export const IdempotencyModel = mongoose.model<IdempotencyRecord>('Idempotency', idempotencySchema);
