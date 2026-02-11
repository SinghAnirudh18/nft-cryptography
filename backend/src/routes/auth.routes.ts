import { Router } from 'express';
import { register, login, walletLogin } from '../controllers/auth.controller.js';

const router: Router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/wallet', walletLogin);

export default router;
