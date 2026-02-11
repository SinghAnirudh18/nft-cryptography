import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import { ethers } from 'ethers';

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
 * @deprecated Legacy wallet login. Use SIWE (getNonce + verify).
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
        console.log(`[SIWE] getNonce for ${normalizedAddress}`);

        const nonce = Math.floor(Math.random() * 1000000).toString();

        let user = await UserModel.findOne({ walletAddress: normalizedAddress });

        if (!user) {
            // Create user with ID = walletAddress (Identity Standardization)
            user = await UserModel.create({
                id: normalizedAddress, // PRIMARY KEY is wallet address
                walletAddress: normalizedAddress,
                nonce,
                username: `User ${normalizedAddress.slice(0, 6)}`,
                email: `${normalizedAddress}@placeholder.com`,
                profileImage: `https://api.dicebear.com/7.x/identicon/svg?seed=${normalizedAddress}` // Default Avatar
            });
        } else {
            user.nonce = nonce;
            await user.save();
        }

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
        console.log(`[SIWE] verify for ${normalizedAddress}`);

        // 1. Verify User Exists
        const user = await UserModel.findOne({ walletAddress: normalizedAddress });
        if (!user) {
            console.error(`[SIWE] User not found for ${normalizedAddress}`);
            return res.status(404).json({ error: 'User not found. Please request nonce first.' });
        }
        if (!user.nonce) {
            console.error(`[SIWE] Nonce missing for user ${user.id}`);
            return res.status(400).json({ error: 'Nonce expired or missing. Please sign in again.' });
        }

        // 2. Cryptographic Verification (Real ECDSA)
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);

            if (recoveredAddress.toLowerCase() !== normalizedAddress) {
                console.error(`[SIWE] Signature verification failed. Recovered: ${recoveredAddress}, Expected: ${normalizedAddress}`);
                return res.status(401).json({ error: 'Invalid signature. Wallet mismatch.' });
            }
        } catch (err) {
            console.error("[SIWE] Signature malformed:", err);
            return res.status(400).json({ error: 'Malformed signature' });
        }

        // 3. Nonce Verification
        if (!message.includes(`Nonce: ${user.nonce}`)) {
            // Flexible check: The message MUST contain the nonce.
            // Ideally we parse the full SIWE message, but checking existence is the bare minimum for MVP.
            // If frontend sends "Nonce: 123456", this check passes.
            // If message is just "Sign in...", we need to ensure checks are strict.
            // Let's assume standard SIWE message format.
            console.error(`[SIWE] Nonce mismatch. Message: ${message}, Expected: ${user.nonce}`);
            return res.status(401).json({ error: 'Invalid nonce. Please sign in again.' });
        }

        // 4. Clear Nonce (Prevent Replay)
        user.nonce = undefined;
        await user.save();

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
        // The middleware already verified the token and attached user to req.user (if we use authMiddleware)
        // However, if this is a standalone check or if we need to return fresh user data:

        // Assuming authMiddleware is used on this route, req.user.id is available.
        // But since we haven't seen the middleware implementation yet, let's decode safely or rely on middleware.
        // For now, let's assume this route is protected by `protect` middleware which adds `req.user`.

        // If usage is: router.get('/verify-token', protect, verifyToken);
        // Then req.user is populated.

        // If req.user is populated by middleware:
        const userReq = req as any; // Type assertion since we don't have the extended definitions handy
        if (!userReq.user) {
            return res.status(401).json({ status: 'error', error: 'Not authenticated' });
        }

        const user = await UserModel.findById(userReq.user.id);
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
