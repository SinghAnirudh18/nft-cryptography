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
 * Login User
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
