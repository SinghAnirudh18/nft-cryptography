# VC Technical Stack Playbook

This document is designed as a **fundraising-facing technical script**. It is structured so founders can answer deep VC diligence questions with confidence.

---

## 1) Frontend Architecture (Investor Narrative + Engineering Depth)

### What we use
- **React 18 + TypeScript + Vite** for fast, type-safe UI delivery and deployment cycles.
- **Wagmi + Viem + RainbowKit** for wallet onboarding, network-aware blockchain interactions, and resilient transaction UX.
- **TanStack React Query** for deterministic API caching, request deduplication, and stale-data control.
- **TailwindCSS + Radix primitives + custom UI components** for scalable design systems and consistent interaction patterns.

### Why this stack is VC-grade
1. **Execution speed**: Vite + modular React lets us ship faster than monolithic frontends.
2. **Risk reduction**: TypeScript and typed wallet flows reduce runtime regressions in Web3 state management.
3. **User conversion**: RainbowKit lowers wallet-connect friction, improving top-of-funnel onboarding.
4. **Cost efficiency**: we balance on-chain reads with backend indexed views to avoid expensive client-only RPC usage.

### How frontend works end-to-end
1. User opens app and connects wallet via RainbowKit (`WalletConnectButton`).
2. `wagmi` config enforces chain constraints and account state.
3. User action (mint/list/rent) opens an explicit modal-driven flow:
   - **Mint**: upload metadata/image -> backend prepares canonical metadata -> user signs/sends mint tx.
   - **List**: create draft in backend -> generate on-chain tx payload -> submit tx in wallet -> backend notified.
   - **Rent**: pricing and duration selected in UI -> tx generated -> on-chain rent call confirms usage rights.
4. UI state is hydrated from backend projector APIs (marketplace listings, user profile, rentals), with optimistic UX where safe.

### Key framework responsibilities (deep dive)
- **React Router**: route-level separation for Marketplace, MyNFTs, and auth-protected flows.
- **AuthContext**: synchronizes JWT/session state with wallet identity so users can mix Web2+Web3 auth rails.
- **API client layer**: centralized request behavior and predictable error handling.
- **Network guards**: ensure users transact on the intended network before signing.

### Technical talking points for VCs
- We separate **transaction intent UX** (frontend) from **transaction truth** (chain + indexer), reducing UI trust assumptions.
- Frontend components are built for **failure-aware UX**: pending tx, replacement tx, user rejection, and chain lag.
- We can add additional chains by extending wagmi config and backend contract registry without redesigning core UX.

---

## 2) Backend Architecture (Investor Narrative + Engineering Depth)

### What we use
- **Node.js + Express + TypeScript** as a high-velocity, strongly typed API layer.
- **MongoDB + Mongoose** for flexible indexed read models (NFTs, listings, rentals, events, sync state).
- **JWT + wallet auth (SIWE-style verify flow)** for hybrid authentication.
- **Background workers** for chain listening and projection.
- **IPFS/Pinata integration** for metadata durability outside centralized storage.

### Why this stack is VC-grade
1. **Scalable read path**: chain events are projected into query-efficient models for low-latency UX.
2. **Operational maturity**: health routes, admin routes, metrics endpoints, and startup self-tests are built-in.
3. **Security posture**: nonce-based wallet verification + protected routes + role-gated admin controls.
4. **Reorg-aware ingestion**: listener/projector design includes confirmations and replay windows.

### How backend works end-to-end
1. API server boots, validates env, connects DB, runs cryptographic self-test, then starts workers.
2. Chain listener ingests contract events and stores canonical event records.
3. Projector converts raw events into product-facing models:
   - NFT ownership/mint state
   - Listing lifecycle (`ACTIVE`, `RENTED`, `CANCELLED`)
   - Rental lifecycle and expiry tracking
4. Frontend consumes backend APIs for rich querying (search, trending, profile, stats).
5. For write flows, backend coordinates draft + notify patterns to reconcile user-submitted tx hashes with final on-chain state.

### Backend subsystems (deep dive)
- **Auth subsystem**:
  - wallet nonce generation
  - message signature verification
  - JWT issuance/validation
  - protected middleware for private endpoints
- **Marketplace subsystem**:
  - chain-first listing creation strategy
  - tx notify endpoint to track pending/confirmed state
  - cancellation generation and reconciliation
- **Rental subsystem**:
  - orchestrates listing-to-rental flow
  - handles tx notification and status projection
- **Admin/Operations subsystem**:
  - `/admin/health`, `/admin/metrics`, contract registry management
  - designed for production observability and SRE handoff

### Technical talking points for VCs
- We avoid fragile “database-is-source-of-truth” patterns; **chain events remain authoritative**.
- Mongo models are **derived state**, enabling fast UX while preserving cryptographic finality guarantees.
- Architecture supports incremental scaling: split API, indexer, and workers into independent services when traffic grows.

---

## 3) Blockchain + Smart Contracts (Investor Narrative + Engineering Depth)

### Contract suite
1. **`DAOMarketplaceNFT.sol`**
   - ERC-721 with URI storage.
   - Implements **ERC-4907** user role (`setUser`, `userOf`, `userExpires`) for time-bound rentals.
   - Tracks `creator` and `tokenMetadataHash` to bind token identity to canonical metadata proofs.
2. **`DAOMarketplaceMarket.sol`**
   - Non-custodial rental marketplace.
   - Sellers keep NFT custody; marketplace only requires approval and invokes `setUser` for rental rights.
   - Listing lifecycle, rent execution, platform fee accounting, treasury payout.
3. **`IERC4907.sol`**
   - Interface standardizing temporary user rights independent of ownership transfer.

### Why this contract design is VC-grade
- **Non-custodial risk profile**: contract never escrows NFTs for listings, reducing custody and attack-surface concerns.
- **Composable standard**: ERC-4907 unlocks gaming, subscriptions, and utility leasing models.
- **Clear monetization rails**: basis-point platform fee and treasury routing support sustainable protocol economics.
- **Event-rich architecture**: emits listing/rent/cancel/mint events for verifiable analytics and compliance-ready auditability.

### Contract mechanics (deep dive)
#### A) Mint
- `mint(to, uri, metadataHash)` requires non-empty URI and non-zero metadata hash.
- Stores hash on-chain (`tokenMetadataHash`) to support backend integrity checks.
- Emits `NFTMinted(tokenId, creator, tokenURI, metadataHash)`.

#### B) List (non-custodial)
- `listNFT(...)` checks:
  - seller ownership (`ownerOf`)
  - marketplace approval (`isApprovedForAll` or `getApproved`)
  - valid pricing and duration bounds
- Persists listing and emits `ListingCreated`.

#### C) Rent
- `rent(listingId, daysToRent)` enforces:
  - listing is active
  - duration within min/max bounds
  - seller still owns NFT and approval remains valid
  - existing user role has expired
  - payment >= total price
- Sets temporary user via ERC-4907 (`setUser`).
- Splits funds between seller and treasury, refunds overpayment, emits `Rented`.

#### D) Cancel
- Authorized seller or contract owner can deactivate listing (`cancelListing`).
- Emits `ListingCancelled` for indexers and analytics.

### Security model & controls
- **ReentrancyGuard** on state-changing market functions.
- **Pausable** emergency stop for incident response.
- **Ownable** admin controls for treasury and fee governance.
- Explicit validation around approvals, ownership continuity, and payment sufficiency.

### Technical talking points for VCs
- We maintain a strict distinction between:
  - **Ownership rights** (ERC-721 owner)
  - **Usage rights** (ERC-4907 user)
- This unlocks recurring revenue models without forcing asset sales.
- Contract events + backend projector provide institutional-grade data trails for dashboards and diligence.

---

## Suggested 3-Part Funding Pitch Script (Use Verbatim)

### Part 1 — Frontend
“We built a type-safe React and wallet-native frontend optimized for conversion and transaction reliability. Users can mint, list, and rent in guided flows, while network checks and wallet abstraction reduce failed transactions. Our UI is designed around asynchronous chain finality, so pending and confirmed states are first-class rather than afterthoughts.”

### Part 2 — Backend
“Our backend is an event-driven coordination layer, not a trust replacement for the blockchain. We ingest and project on-chain events into high-performance query models, enabling fast consumer UX while preserving chain truth. We ship with health endpoints, metrics, and admin controls so the system is production-operable from day one.”

### Part 3 — Blockchain Contracts
“On-chain, we use a non-custodial ERC-4907 architecture that separates ownership from temporary usage rights. That allows rental monetization, utility leasing, and future composable use cases. Marketplace economics are encoded transparently via fee basis points and treasury routing, with strong event logs for analytics, governance, and auditability.”

---

## Rapid-Fire VC Q&A Prep

- **Q: Why not only store everything on-chain?**  
  **A:** We keep settlement truth on-chain but project read models off-chain for latency and product-grade queryability.

- **Q: What happens if chain reorgs occur?**  
  **A:** Listener/projector design includes confirmation buffers and replay-safe state updates.

- **Q: Is this custodial?**  
  **A:** No—listing is approval-based and ownership remains with seller unless transferred by ERC-721 transfer operations.

- **Q: Where does revenue come from?**  
  **A:** Platform fee in basis points, routed automatically to treasury during successful rentals.

- **Q: How do you scale?**  
  **A:** Horizontally split API, listener, and projector workers; add cache and read replicas; extend multi-chain via contract registry.

