# P2P NFT Rental Marketplace

A fully functional Peer-to-Peer NFT Rental platform where users can list their NFTs for rent, and others can rent them for a specific duration. The system handles the logic for "Escrow" (locking the asset), usage rights, and returns.

> **Status**: MVP Completed (Frontend + Backend + Database Integrated).

## 🚀 Features Implemented

### 1. User Authentication & Profile
- **Register/Login**: Secure JWT-based authentication.
- **User Dashboard**: View owned assets, active rentals, and listings.

### 2. NFT Management
- **Minting**: Users can create (mint) new NFTs (currently stored in MongoDB).
- **Ownership**: Tracks current owner and history.

### 3. Marketplace
- **Browse**: Filter by Category, Price, and Status.
- **Search**: Real-time search by name or collection.
- **Trending**: Algorithmic sorting of popular assets.

### 4. P2P Rental System (Core Feature)
- **List for Rent**: Owners can list NFTs with a daily rental price and max duration.
- **Rent Now**: Renters can pay (mock currency) to rent an asset.
- **Escrow Logic**:
  - When rented, the NFT is **locked** in the owner's wallet (cannot be sold/transferred).
  - The Renter gets "usage rights" and sees it in their "My Rentals" tab.
- **Return System**:
  - **Manual Return**: Renter can return the NFT before expiry.
  - **Auto/Owner Return**: Owner can reclaim the NFT if the rental period has expired.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Shadcn UI.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose Schema).
- **Authentication**: JWT, bcrypt.

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (Running locally or Atlas URI)

### 1. Backend Setup
```bash
cd backend
npm install
# Create .env file based on .env.example
npm run dev
# Server starts on http://localhost:5000
```

### 2. Frontend Setup
```bash
# In the root directory
npm install
npm run dev
# App starts on http://localhost:5173
```

## 🗺️ Roadmap & Future Plans

### Phase 0: Refactoring & Stabilization (Immediate)
- [ ] **Schema Consistency**: Migrate `Listing` schema to use `Number` for prices (matching `NFT` and `Rental` schemas).
- [ ] **Data Cleanup**: clear mock data and ensure pure database-driven flow.
- [ ] **Type Safety**: strict type checking for all API responses.

### Phase 1: Blockchain Integration (The Web3 Leap)
1. **Smart Contract Development**:
   - Develop `RentableNFT.sol` implementing ERC-4907 (User Role).
   - Write tests using Hardhat/Foundry.
2. **Frontend Connection**:
   - Integrate `wagmi` / `viem` for wallet connection (Metamask, Rainbow).
   - Replace Email/Password login with "Connect Wallet".
3. **Hybrid Logic**:
   - Update Backend to index on-chain events.
   - Use Database for caching metadata, but Blockchain as source of truth for Ownership/Rental status.

### Phase 2: Advanced Rental Features
- [ ] **Collateral-Free Rentals**: Implement reputation-based non-collateral rentals.
- [ ] **Revenue Sharing**: Split rental fees between Platform and Owner.
- [ ] **Bundle Rentals**: Rent entire decks/collections at once.

### Phase 3: Analytics & Notifications
- [ ] **Real-time Notifications**: Email/In-app alerts for Second-price auctions/Rental Expiry.
- [ ] **Advanced Analytics**: Dashboard for rental yield, portfolio performance, and floor price tracking.

## 📄 License
MIT
