import { ethers } from 'ethers';
import { isNonEmptyString, assertValidRpcUrl } from './typeguards.js';

/**
 * Creates a read-only provider for the configured chain.
 *
 * ARCHITECTURE NOTE: This provider is INTENTIONALLY read-only.
 * The backend is a blockchain observer — it reads events and state.
 * It NEVER signs transactions or holds a private key.
 * All write operations (mint, list, rent, cancel) are signed by the USER'S wallet via MetaMask/WalletConnect.
 *
 * Chain ID is driven by CHAIN_ID env var so this works for any EVM network.
 */
export function getDynamicProvider(): ethers.Provider {
    const rawUrls = [
        process.env.RPC_URL,
        process.env.SEPOLIA_RPC,
        process.env.TESTNET_RPC_URL,
        process.env.SEPOLIA_RPC_FALLBACK,
        process.env.PUBLIC_RPC,
    ];

    // Filter empty/undefined, deduplicate, and validate URLs
    const uniqueUrls = [...new Set(rawUrls.filter(isNonEmptyString))];

    if (uniqueUrls.length === 0) {
        throw new Error('No RPC URL configured. Set SEPOLIA_RPC or RPC_URL in .env');
    }

    // Read chain ID from env — defaults to Sepolia (11155111) for safety
    const chainId = parseInt(process.env.CHAIN_ID || '11155111', 10);

    const providerEntries: any[] = [];

    for (const url of uniqueUrls) {
        try {
            const validatedUrl = assertValidRpcUrl(url);
            const priority = providerEntries.length === 0 ? 1 : 2;

            if (validatedUrl.startsWith('ws://') || validatedUrl.startsWith('wss://')) {
                providerEntries.push({ provider: new ethers.WebSocketProvider(validatedUrl), priority, weight: 1 });
                continue;
            }

            // staticNetwork prevents eth_chainId polling, which can return wrong chain
            // on some free-tier RPCs that serve multiple networks.
            const staticNetwork = ethers.Network.from(chainId);
            const provider = new ethers.JsonRpcProvider(validatedUrl, staticNetwork, { staticNetwork: true });
            providerEntries.push({ provider, priority, weight: 1 });
        } catch (err: any) {
            console.warn(`⚠️  Skipping invalid RPC URL "${url}": ${err.message}`);
        }
    }

    if (providerEntries.length === 0) {
        throw new Error('No valid RPC URLs could be initialized. Check your .env configuration.');
    }

    if (providerEntries.length === 1) {
        return providerEntries[0].provider;
    }

    // quorum:1 — any single provider succeeding is enough.
    return new ethers.FallbackProvider(providerEntries, 1);
}
