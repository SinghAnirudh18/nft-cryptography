import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import { CryptoService } from '../security/cryptoService.js';

const generateToken = (id: string) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: (process.env.JWT_EXPIRE || '30d') as any
    });
};

/**
 * Register User
 * @deprecated Legacy email/password registration. Use SIWE.
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
            id: email.toLowerCase(), // Use email or walletAddress as ID, not a timestamp
            username,
            email: email.toLowerCase(),
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
 * @deprecated Legacy wallet login. Use SIWE (getNonce + verify).
 */
export const walletLogin = async (req: Request, res: Response) => {
    return res.status(410).json({
        status: 'error',
        error: 'Legacy wallet login is deprecated. Please use SIWE flow.'
    });
};

/**
 * Login
 * @deprecated Legacy email/password login. Use SIWE.
 */
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

/**
 * Get Nonce for SIWE
 */
export const getNonce = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        const normalizedAddress = walletAddress.toLowerCase();

        // 1. Generate Nonce
        const nonce = await CryptoService.generateNonce();

        // 2. Compute Hash for Storage
        const nonceHash = CryptoService.getNonceHash(normalizedAddress, nonce);

        // 3. Set Expiration (5 minutes)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        let user = await UserModel.findOne({ walletAddress: normalizedAddress });

        if (!user) {
            // Create user with ID = walletAddress (Identity Standardization)
            user = await UserModel.create({
                id: normalizedAddress, // PRIMARY KEY is wallet address
                walletAddress: normalizedAddress,
                nonce: nonceHash, // STORE HASH, NOT RAW NONCE
                nonceExpiresAt: expiresAt,
                username: `User ${normalizedAddress.slice(0, 6)}`,
                profileImage: `https://api.dicebear.com/7.x/identicon/svg?seed=${normalizedAddress}` // Default Avatar
            });
        } else {
            user.nonce = nonceHash;
            user.nonceExpiresAt = expiresAt;
            await user.save();
        }

        // Return RAW nonce to user (so they can sign it)
        res.status(200).json({ nonce });
    } catch (error: any) {
        console.error("Get Nonce Error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Verify SIWE Signature
 */
export const verify = async (req: Request, res: Response) => {
    try {
        let { walletAddress, signature, message } = req.body;

        if (!walletAddress || !signature || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const normalizedAddress = walletAddress.toLowerCase();

        // 1 & 2 & 4: Atomic Fetch, Expiry Check, and Nonce Consumption
        // findOneAndUpdate ensures that if two concurrent requests hit this, only one gets the user document with the nonce.
        const user = await UserModel.findOneAndUpdate(
            {
                walletAddress: normalizedAddress,
                nonce: { $exists: true, $ne: null },
                nonceExpiresAt: { $gt: new Date() }
            },
            {
                $unset: { nonce: "", nonceExpiresAt: "" }
            },
            { new: false } // return the document BEFORE the update so we still have the nonce hash to verify
        );

        if (!user || !user.nonce) {
            return res.status(401).json({ error: 'Nonce invalid, expired, or already consumed. Please request a new nonce.' });
        }

        // 3. Authenticate via CryptoService (The Firewall)
        // Note: authenticateSIWE is actually async in our new implementation.
        const authResult = await CryptoService.authenticateSIWE(
            message,
            signature,
            normalizedAddress,
            user.nonce // Pass the stored HASH from the atomically retrieved document
        );

        if (!authResult.success) {
            // Re-auth failed (e.g. bad signature) — the nonce was consumed above, which is correct
            // (a failed attempt should burn the nonce anyway).
            return res.status(401).json({ error: authResult.error || 'Authentication failed' });
        }

        // 5. Issue Token
        const token = generateToken(user.id);

        res.status(200).json({
            status: 'success',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress,
                profileImage: user.profileImage
            }
        });

    } catch (error: any) {
        console.error("Verify Error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Verify JWT Token (Session Check)
 */
export const verifyToken = async (req: Request, res: Response) => {
    try {
        const userReq = req as any;
        if (!userReq.user) {
            return res.status(401).json({ status: 'error', error: 'Not authenticated' });
        }

        // JWT payload 'id' is the wallet address (set during SIWE verify)
        const walletAddr = userReq.user.id?.toLowerCase();
        const user = await UserModel.findOne({ walletAddress: walletAddr });
        if (!user) {
            return res.status(404).json({ status: 'error', error: 'User not found' });
        }

        res.status(200).json({
            status: 'success',
            valid: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress,
                profileImage: user.profileImage
            }
        });

    } catch (error: any) {
        console.error("Verify Token Error:", error);
        res.status(401).json({ status: 'error', error: 'Invalid token' });
    }
};
