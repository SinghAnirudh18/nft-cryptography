# Project Architecture — NFT Cryptography Marketplace

This document explains the **complete architecture** of the project end-to-end, so an engineer (or investor) can understand:

1. What is built in **Frontend**, **Backend**, and **Blockchain**.
2. Which **libraries/frameworks** are used and why.
3. How data and transactions flow through the system.
4. How **cryptography** is actually implemented across all three layers.

---

## 0) High-Level System Overview

This project is a full-stack **NFT marketplace + rental platform** built around **ERC-4907**.

- **Frontend**: Wallet-native React app where users mint, list, browse, and rent NFTs.
- **Backend**: API + event indexing/projection layer that handles auth, metadata workflows, and fast query APIs.
- **Blockchain**: Smart contracts where ownership and rental rights are enforced.

### Core idea
- **Ownership** = ERC-721 owner.
- **Usage rights** = ERC-4907 user with expiry.
- **Truth source** = blockchain events and state.
- **UX/read performance** = backend projection models.

---

## 1) Frontend Architecture

## 1.1 Frontend stack and why it is used

- **React 18**: Component-based UI for marketplace, profile, and rental flows.
- **TypeScript**: Strong typing for API payloads, wallet state, tx status, and component contracts.
- **Vite**: Fast local dev server and production bundle pipeline.
- **wagmi + viem**: Wallet connection and EVM interaction abstraction.
- **RainbowKit**: Wallet-connect UX (MetaMask and WalletConnect-style providers).
- **@tanstack/react-query**: Caching and synchronization for backend API state.
- **React Router**: Route-level page architecture.
- **TailwindCSS + Radix UI**: Styling + UI primitives for modals/forms/menus.

## 1.2 Frontend structure

- `pages/`: route-level screens (`Marketplace`, `MyNFTs`, etc.).
- `components/`: reusable UI and domain components.
  - `components/mint/`: mint flow modals.
  - `components/rentals/`: listing + rent confirmation flows.
- `config/wagmi.ts`: wallet/network configuration.
- `context/AuthContext.tsx`: API-session auth state bridging wallet + backend auth.
- `api/client.ts`: centralized HTTP client logic.

## 1.3 Frontend runtime flow

### A) Authentication flow (wallet + backend)
1. User connects wallet in UI.
2. Frontend requests nonce from backend.
3. User signs challenge message.
4. Frontend submits signature for verification.
5. Backend verifies signature and returns token/session for protected endpoints.

### B) Mint flow
1. User enters NFT metadata and uploads image.
2. Frontend submits metadata/image to backend `prepare` endpoint.
3. Backend canonicalizes metadata, stores asset/metadata, returns mint-ready payload.
4. Frontend triggers wallet transaction calling NFT contract `mint(...)`.
5. Frontend notifies backend of tx hash.
6. Backend listener/projector confirms on-chain event and updates read models.

### C) List flow (chain-first)
1. Frontend creates listing draft via backend.
2. Backend returns transaction payload for market contract `listNFT(...)`.
3. User signs/submits tx from wallet.
4. Frontend sends tx hash to backend notify endpoint.
5. Event indexer confirms `ListingCreated`; listing becomes active in projected DB.

### D) Rent flow
1. User selects duration and confirms pricing.
2. Frontend submits rental tx to market contract `rent(...)` with payment.
3. Frontend notifies backend of tx hash.
4. On event confirmation, backend updates listing/rental/NFT state.

## 1.4 Cryptography usage in frontend

Frontend does not hold private keys (wallet does), but it is crypto-aware:

- Uses **EIP-191 style message signing UX** for login challenge.
- Handles **address normalization + signature payload transfer** to backend verifier.
- Coordinates **transaction signing** in wallet for mint/list/rent calls.
- Uses contract ABIs for deterministic call encoding and typed interaction.

So the frontend’s crypto role is: **request signatures, route signed proofs, and orchestrate user-approved transactions**.

---

## 2) Backend Architecture

## 2.1 Backend stack and why it is used

- **Node.js + Express + TypeScript**: API orchestration and maintainable service boundaries.
- **MongoDB + Mongoose**: flexible document models for projected chain state and user/domain entities.
- **ethers.js**: provider + contract interactions + tx/event decoding where needed.
- **JWT** auth: stateless API session control after wallet auth verification.
- **Multer**: media upload handling during mint preparation.
- **Background workers**: chain listener + projector for eventual consistency and high-performance querying.

## 2.2 API architecture (request layer)

Backend exposes modular route groups:

- `/api/auth`: register/login/wallet auth/nonce/verify-token.
- `/api/nfts`: NFT prepare/confirm and query routes.
- `/api/marketplace`: listing draft/notify/cancel/search/stats.
- `/api/rentals`: rent and rental notify routes.
- `/api/users`: profile and portfolio queries.
- `/admin`: health/metrics/contracts (admin-gated operations).

Middleware:
- **Auth middleware** for protected routes.
- **Upload middleware** for mint image ingestion.
- **Error middleware** for standard response/error format.

## 2.3 Worker architecture (chain synchronization)

The backend boot process:
1. Load env.
2. Connect DB.
3. Run cryptography self-test.
4. Start worker system.

Workers consist of:

### A) Chain Listener
- Connects to provider.
- Loads NFT + marketplace ABIs.
- Uses configurable confirmations and reorg guard windows.
- Ingests contract events and records canonical event entries.

### B) Projector
- Consumes stored events.
- Updates derived models (`NFT`, `Listing`, `Rental`, etc.).
- Applies idempotent updates to survive duplicate/replayed events.
- Produces fast read-path state for frontend APIs.

### Why this pattern
- Blockchain remains source of truth.
- Backend DB is optimized projection/read model.
- Improves UX latency and supports rich filters/search/stats not efficient via raw RPC.

## 2.4 Data model intent (conceptual)

- **Event**: immutable chain event log for replay/debug.
- **SyncState**: listener/projector position checkpoints.
- **NFT**: current owner/renter/metadataHash projection.
- **Listing**: listing lifecycle (`ACTIVE`, `RENTED`, `CANCELLED`).
- **Rental**: rental history and active usage windows.
- **Draft/Idempotency/Registry**: tx coordination and operational safety.

## 2.5 Cryptography usage in backend

Backend is where most custom cryptographic logic exists:

- **SHA-256 implementation**: used for deterministic hashing workflows and proof alignment.
- **Keccak-256 implementation**: Ethereum-compatible hashing logic.
- **ECDSA (secp256k1) verification**: validates signed wallet challenges.
- **Secure random nonce generator**: cryptographically secure nonce issuance for auth challenge.

It also keeps standard proven libs where appropriate:
- **bcryptjs** for password hashing.
- **jsonwebtoken** for token issuance/verification.

This means backend combines:
- Custom implementations for educational/transparency crypto pathways.
- Production-standard libs where standardization is preferred.

---

## 3) Blockchain / Smart Contract Architecture

## 3.1 Contracts and responsibilities

### A) `DAOMarketplaceNFT.sol`
Purpose: NFT minting + ERC-4907 user-rights support.

Key responsibilities:
- Mint NFT with URI and metadata hash.
- Store token creator.
- Store metadata hash on-chain.
- Implement ERC-4907:
  - `setUser(tokenId, user, expires)`
  - `userOf(tokenId)`
  - `userExpires(tokenId)`

### B) `DAOMarketplaceMarket.sol`
Purpose: Non-custodial marketplace for listing and renting.

Key responsibilities:
- Create listing with price/duration constraints.
- Validate ownership + approval at listing and rental time.
- Rent by assigning temporary user via NFT contract.
- Split payment between seller and treasury (platform fee).
- Allow cancellation by seller/admin.
- Provide pause/fee/treasury admin controls.

### C) `IERC4907.sol`
Purpose: Interface for temporary user rights.

Key concept:
- Token can have a temporary **user** without ownership transfer.

## 3.2 Blockchain flow (contract-level)

### Mint
1. Call `mint(to, uri, metadataHash)`.
2. Contract validates non-empty metadata fields.
3. Token minted and URI stored.
4. Creator + metadata hash stored.
5. `NFTMinted` event emitted.

### List
1. Owner calls `listNFT(...)` on marketplace contract.
2. Contract checks owner and marketplace approval.
3. Listing stored as active.
4. `ListingCreated` emitted.

### Rent
1. Renter calls `rent(listingId, daysToRent)` and sends ETH.
2. Contract validates listing state, duration bounds, ownership continuity, approval, and non-overlapping rental.
3. Marketplace calls NFT `setUser(...)` to assign usage rights until expiry.
4. Funds distributed (seller + treasury fee + optional refund).
5. `Rented` event emitted.

### Cancel
1. Seller/owner calls `cancelListing(listingId)`.
2. Listing marked inactive.
3. `ListingCancelled` emitted.

## 3.3 Cryptography usage in blockchain layer

Smart contracts rely on cryptographic guarantees of Ethereum itself:

- **Address ownership** derives from ECDSA keypairs.
- **Transaction authenticity** guaranteed by signed tx.
- **Event logs** are tamper-evident within chain consensus.
- **Metadata hash anchoring** (`bytes32 metadataHash`) gives integrity checkpoints for off-chain content.

So blockchain crypto role is: **final settlement, verifiable rights, and immutable audit trail**.

---

## 4) End-to-End Full Project Flow (single narrative)

1. User connects wallet on frontend.
2. User authenticates by signing nonce challenge.
3. Backend verifies signature and opens authenticated API session.
4. User mints/lists/rents through frontend actions.
5. Wallet signs and broadcasts transaction.
6. Backend receives tx notifications and continues asynchronous reconciliation.
7. Listener ingests contract events after confirmation depth.
8. Projector converts events into queryable state.
9. Frontend reads projected APIs for low-latency UX.
10. If needed, blockchain state can always be re-queried/replayed for correctness.

This architecture balances:
- **Web3 trust model** (chain truth)
- **Web2 product performance** (indexed read models)
- **cryptography-backed auth and integrity checks**

---

## 5) Practical "Who does what" summary

- **Frontend**: user experience + wallet orchestration + transaction initiation.
- **Backend**: auth, metadata pipeline, event indexing, projection, and API serving.
- **Blockchain**: canonical ownership, rentals, economics, and immutable event history.

---

## 6) Why this architecture is technically strong

- Uses standards-based contracts (ERC-721 + ERC-4907).
- Uses non-custodial rental model.
- Maintains chain-first truth with robust off-chain projection pattern.
- Includes cryptography as actual implementation, not only dependency usage.
- Designed for scaling: listener/projector/API can be split into independent services.

