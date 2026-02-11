import { Router } from 'express';
import { register, login, walletLogin, getNonce, verify, verifyToken } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router: Router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/wallet', walletLogin);

// SIWE Routes
router.get('/nonce/:walletAddress', getNonce);
router.post('/verify', verify);
router.get('/verify-token', protect, verifyToken);

export default router;
