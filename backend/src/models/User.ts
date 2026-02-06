import mongoose from 'mongoose';
import { User } from '../types/index.js';

const userSchema = new mongoose.Schema<User>({
    id: { type: String, required: true, unique: true }, // We might want to switch to _id, but keeping string id for compatibility with existing frontend types for now
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for now, required later for auth
    walletAddress: { type: String, unique: true },
    profileImage: { type: String },
    bio: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model<User>('User', userSchema);
