import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret_key_change_in_prod', {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

/**
 * Register User
 */
export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ status: 'error', error: 'Please provide all fields' });
        }

        // Check if user exists
        const userExists = await UserModel.findOne({ email });
        if (userExists) {
            return res.status(400).json({ status: 'error', error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await UserModel.create({
            id: Date.now().toString(), // Custom ID for now to match frontend
            username,
            email,
            password: hashedPassword,
            createdAt: new Date()
        });

        if (user) {
            res.status(201).json({
                status: 'success',
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    token: generateToken(user.id)
                }
            });
        } else {
            res.status(400).json({ status: 'error', error: 'Invalid user data' });
        }
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};

/**
 * Wallet Login (Connect Wallet)
 */
export const walletLogin = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ status: 'error', error: 'Wallet address is required' });
        }

        // Check if user exists with this wallet
        let user = await UserModel.findOne({ walletAddress });

        if (!user) {
            // Create new user for this wallet
            // Note: We need to handle required fields. 
            // For MVP, we'll generate placeholders. ideally, we'd ask user to complete profile.
            const uniqueSuffix = Date.now().toString().slice(-4);
            const shortAddress = walletAddress.substring(0, 6);

            // Hash a dummy password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(`wallet_${walletAddress}`, salt);

            user = await UserModel.create({
                id: Date.now().toString(),
                username: `WalletUser_${shortAddress}_${uniqueSuffix}`,
                email: `${walletAddress.toLowerCase()}@wallet.placeholder`, // unique placeholder
                password: hashedPassword,
                walletAddress: walletAddress,
                createdAt: new Date()
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress,
                token: generateToken(user.id)
            }
        });

    } catch (error: any) {
        console.error("Wallet login error:", error);
        res.status(500).json({ status: 'error', error: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: 'error', error: 'Please provide email and password' });
        }

        // Check for user
        const user = await UserModel.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password || ''))) {
            res.status(200).json({
                status: 'success',
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    token: generateToken(user.id)
                }
            });
        } else {
            res.status(401).json({ status: 'error', error: 'Invalid credentials' });
        }
    } catch (error: any) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};
