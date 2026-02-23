/**
 * ContractRegistry.ts
 * Stores deployed contract addresses per network.
 * ChainListener reads from this collection on startup (preferring DB over .env)
 * so contract addresses can be updated via /admin/contracts without a restart.
 */

import mongoose from 'mongoose';

export interface ContractRegistryEntry extends mongoose.Document {
    name: string;       // e.g. 'nft', 'marketplace'
    network: string;    // e.g. 'sepolia', 'mainnet'
    address: string;    // checksummed Ethereum address
    abi?: any[];        // optional ABI for reference
    deployedAt?: Date;
    updatedAt: Date;
}

const contractRegistrySchema = new mongoose.Schema<ContractRegistryEntry>({
    name: { type: String, required: true },
    network: { type: String, required: true },
    address: { type: String, required: true, lowercase: true },
    abi: { type: mongoose.Schema.Types.Mixed },
    deployedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now }
});

// One entry per name+network combination
contractRegistrySchema.index({ name: 1, network: 1 }, { unique: true });

export const ContractRegistryModel = mongoose.model<ContractRegistryEntry>('ContractRegistry', contractRegistrySchema);
