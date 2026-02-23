/**
 * canonicalMetadata.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for NFT metadata canonicalization and hashing.
 *
 * Rule: the metadataHash stored on-chain, in the DB, and verified by the
 * projector MUST all use the same algorithm.  Any divergence causes permanent
 * "unverified" marks on NFTs.
 *
 * Algorithm
 * ─────────
 * 1. Build a canonical object with a fixed key order:
 *    name, description, image, attributes, external_url, file_hash, creator
 * 2. Stringify with no extra whitespace: JSON.stringify(canonical)
 * 3. SHA-256 the UTF-8 bytes, return lowercase hex prefixed with "0x".
 *
 * The 0x prefix matches the bytes32 encoding expected by the smart contract.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createHash } from 'crypto';

export interface NFTMetadataInput {
    name: string;
    description?: string;
    image: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    external_url?: string;
    file_hash?: string;
    creator?: string;
}

/**
 * Produce a deterministic canonical object with fixed key order.
 * Extra keys are dropped; missing optional keys are set to empty defaults.
 */
export function canonicalizeMetadata(input: NFTMetadataInput): Record<string, unknown> {
    return {
        name: input.name ?? '',
        description: input.description ?? '',
        image: input.image ?? '',
        attributes: Array.isArray(input.attributes) ? input.attributes : [],
        external_url: input.external_url ?? '',
        file_hash: input.file_hash ?? '',
        creator: input.creator ?? '',
    };
}

/**
 * Compute the canonical metadataHash for an NFT metadata object.
 * Returns a 0x-prefixed lowercase hex SHA-256 string.
 * This is the value to pass to `mint(to, uri, metadataHash)` on-chain.
 */
export function hashMetadata(input: NFTMetadataInput): string {
    const canonical = canonicalizeMetadata(input);
    const json = JSON.stringify(canonical); // no extra spaces
    return '0x' + createHash('sha256').update(json, 'utf8').digest('hex');
}

/**
 * Hash an already-stringified canonical JSON string.
 * Used by the projector when it has already fetched the raw IPFS content.
 * The projector must parse → canonicalize → re-stringify before calling this.
 */
export function hashCanonicalString(canonicalJson: string): string {
    return '0x' + createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}
