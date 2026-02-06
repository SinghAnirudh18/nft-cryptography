export interface NFT {
    id: string;
    name: string;
    description?: string;
    image: string;
    price: string;
    rentalPrice: string;
    currency: string;
    collection: string;
    creator: string;
    owner?: string;
    status: 'available' | 'rented' | 'listing';
    likes?: number;
    views?: number;
    timeLeft?: string;
    rentalEndDate?: Date;
}

export interface User {
    id: string;
    username: string;
    email: string;
    walletAddress?: string;
    profileImage?: string;
}

export interface ApiResponse<T> {
    status: 'success' | 'error';
    data: T;
    message?: string;
    error?: string;
}
