export interface NFT {
    id: string;
    name: string;
    description?: string;
    image: string;
    tokenId?: string;
    contractAddress?: string;
    owner: string;
    collection: string;
    creator: string;
    price: string;
    rentalPrice?: string;
    currency: string;
    status: 'available' | 'rented' | 'listing' | 'listed'; // Added listing to match frontend/controller usage
    likes: number;
    views?: number;
    metadata?: Record<string, any>;
    timeLeft?: string;
    rentalEndDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Rental {
    id: string;
    nftId: string;
    renterId: string;
    ownerId: string;
    rentalPrice: string;
    currency: string;
    startDate: Date;
    endDate: Date;
    status: 'active' | 'completed' | 'cancelled';
    transactionHash?: string;
    createdAt?: Date;
}

export interface Listing {
    id: string;
    nftId: string;
    sellerId: string;
    price: string;
    rentalPrice?: string;
    currency: string;
    duration?: number; // in days
    status: 'active' | 'sold' | 'cancelled';
    views: number;
    likes: number;
    createdAt?: Date;
}

export interface User {
    id: string;
    username: string;
    email: string; // Made required to match schema
    password?: string; // Added for auth
    walletAddress?: string;
    profileImage?: string;
    bio?: string;
    createdAt?: Date;
}

export interface UserStats {
    totalNFTs: number;
    totalValue: string;
    activeListings: number;
    totalRentals: number;
    currency: string;
}

export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    message?: string;
    data?: T;
    error?: string;
}
