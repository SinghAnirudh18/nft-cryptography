// backend/src/services/projector.ts
import mongoose from 'mongoose';
import { EventModel } from '../models/Event.js';
import { ListingModel } from '../models/Listing.js';
import { NFTModel } from '../models/NFT.js';
import { RentalModel } from '../models/Rental.js';
import { DraftModel } from '../models/Draft.js';
import { ethers } from 'ethers';

/**
 * Projector Service (Chain-First / Ledger-Only)
 * ─────────────────────────────────────────────────────────────────────────────
 * Sequential event worker that derives DB state ONLY from the Projector (Event ledger).
 * It enforces blockchain truth by identifying NFTs strictly by {tokenAddress, tokenId}.
 */

export class Projector {
    private isRunning: boolean = false;
    private provider: ethers.Provider | null = null;

    constructor() { }

    public async start(provider: ethers.Provider) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.provider = provider;
        console.log(`[Projector] Started in Chain-First mode.`);
        this.processLoop();
    }

    public stop() {
        this.isRunning = false;
    }

    private async processLoop() {
        while (this.isRunning) {
            try {
                await this.processNextPending();
            } catch (err) {
                console.error("[Projector] Loop error:", err);
                await new Promise(r => setTimeout(r, 5000));
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    private async processNextPending() {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const event = await EventModel.findOne({ status: 'pending' })
                .sort({ blockNumber: 1, logIndex: 1 })
                .session(session);

            if (!event) {
                await session.abortTransaction();
                return;
            }

            await this.applyEvent(event, session);

            event.status = 'processed';
            event.updatedAt = new Date();
            await event.save({ session });

            await session.commitTransaction();
        } catch (err: any) {
            await session.abortTransaction();
            console.error(`[Projector] Critical failure applying event: ${err.message}`);
        } finally {
            session.endSession();
        }
    }

    private async applyEvent(event: any, session: mongoose.ClientSession) {
        const { eventName, args, txHash, blockNumber, contractAddress } = event;

        switch (eventName) {
            case 'NFTMinted':
                await this.handleNFTMinted(args, txHash, blockNumber, contractAddress, session);
                break;
            case 'ListingCreated':
                await this.handleListingCreated(args, txHash, blockNumber, contractAddress, session);
                break;
            case 'Rented':
                await this.handleRented(args, txHash, blockNumber, session);
                break;
            case 'ListingCancelled':
                await this.handleListingCancelled(args, session);
                break;
            default:
                console.log(`[Projector] Skipping unhandled event: ${eventName}`);
        }
    }

    /**
     * SELF-HEALING IDEMPOTENT UPDATE
     * Ensures we don't crash on duplicate index pollution from legacy runs.
     */
    private async safeUpdateNFT(filter: any, update: any, session: mongoose.ClientSession) {
        try {
            await NFTModel.findOneAndUpdate(filter, update, { session, upsert: true });
        } catch (err: any) {
            if (err.code === 11000) {
                // Conflict detected (likely tokenAddress/tokenId index mismatch with filter)
                // In Chain-First architecture, we overwrite based on the authoritative identity.
                const fallbackFilter = {
                    tokenAddress: (update.$set.tokenAddress || filter.tokenAddress).toLowerCase(),
                    tokenId: update.$set.tokenId || filter.tokenId
                };
                await NFTModel.updateOne(fallbackFilter, update, { session });
            } else throw err;
        }
    }

    private async handleNFTMinted(args: any, txHash: string, blockNumber: number, contractAddress: string, session: mongoose.ClientSession) {
        const { tokenId, creator, metadataHash } = args;
        if (!creator || !contractAddress) return;

        const resolvedTokenAddress = contractAddress.toLowerCase();
        const resolvedTokenId = tokenId.toString();
        const resolvedCreator = creator.toLowerCase();

        // 1. Authoritative Identity Entry
        await this.safeUpdateNFT(
            { tokenAddress: resolvedTokenAddress, tokenId: resolvedTokenId },
            {
                $set: {
                    tokenAddress: resolvedTokenAddress,
                    tokenId: resolvedTokenId,
                    creator: resolvedCreator,
                    owner: resolvedCreator, // Initial owner is creator
                    metadataHash,
                    mintTxHash: txHash,
                    blockNumber,
                    updatedAt: new Date()
                }
            },
            session
        );

        // 2. Draft Enrichment (Hint Only)
        await DraftModel.updateOne(
            { metadataHash, creator: resolvedCreator },
            { $set: { status: 'MINTED' } },
            { session }
        );
    }

    private async handleListingCreated(args: any, txHash: string, blockNumber: number, contractAddress: string, session: mongoose.ClientSession) {
        const { onChainListingId, seller, tokenAddress, tokenId, pricePerDay, minDuration, maxDuration, metadataHash } = args;
        if (!tokenAddress || !seller || !tokenId) return;

        const resolvedTokenAddress = tokenAddress.toLowerCase();
        const resolvedTokenId = tokenId.toString();
        const resolvedSeller = seller.toLowerCase();

        // OWNERSHIP SNAPSHOT: Ensure the seller actually owns the NFT at this block
        const nft = await NFTModel.findOne({
            tokenAddress: resolvedTokenAddress,
            tokenId: resolvedTokenId
        }).session(session);

        if (!nft || (nft.owner !== resolvedSeller)) {
            console.warn(`[Projector] Listing ${onChainListingId} rejected: Seller ${resolvedSeller} does not own NFT ${resolvedTokenId}`);
            return;
        }

        // FACT: Listing exists and is ACTIVE, tied to a specific sellerAddress snapshot
        await ListingModel.findOneAndUpdate(
            { onChainListingId: Number(onChainListingId) },
            {
                $set: {
                    sellerAddress: resolvedSeller, // OWNERSHIP SNAPSHOT
                    tokenAddress: resolvedTokenAddress,
                    tokenId: resolvedTokenId,
                    pricePerDay: pricePerDay?.toString(),
                    minDuration: Number(minDuration),
                    maxDuration: Number(maxDuration),
                    metadataHash,
                    status: 'ACTIVE',
                    txHash,
                    blockNumber,
                    confirmedAt: new Date()
                }
            },
            { session, upsert: true }
        );
    }

    private async handleRented(args: any, txHash: string, blockNumber: number, session: mongoose.ClientSession) {
        const { onChainListingId, renter, expires, totalPrice } = args;

        const listing = await ListingModel.findOneAndUpdate(
            { onChainListingId: Number(onChainListingId) },
            { $set: { status: 'RENTED' } },
            { session, new: true }
        );

        if (!listing) return;

        await RentalModel.findOneAndUpdate(
            { txHash },
            {
                $set: {
                    onChainListingId: Number(onChainListingId),
                    listingId: listing._id.toString(),
                    tokenAddress: listing.tokenAddress.toLowerCase(),
                    tokenId: listing.tokenId.toString(),
                    renter: (renter || '').toLowerCase(),
                    owner: (listing.sellerAddress || '').toLowerCase(),
                    totalPrice: totalPrice?.toString(),
                    expiresAt: new Date(Number(expires) * 1000),
                    status: 'ACTIVE',
                    startBlock: blockNumber,
                    updatedAt: new Date()
                }
            },
            { session, upsert: true }
        );

        await NFTModel.updateOne(
            { tokenAddress: listing.tokenAddress.toLowerCase(), tokenId: listing.tokenId.toString() },
            {
                $set: {
                    renter: (renter || '').toLowerCase(),
                    expiresAt: new Date(Number(expires) * 1000),
                    updatedAt: new Date()
                }
            },
            { session }
        );
    }

    private async handleListingCancelled(args: any, session: mongoose.ClientSession) {
        const { onChainListingId } = args;
        await ListingModel.updateOne(
            { onChainListingId: Number(onChainListingId) },
            { $set: { status: 'CANCELLED' } },
            { session }
        );
    }
}

export function createProjector() {
    return new Projector();
}
