import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';

const router = Router();
router.post('/register', authLimiter, wrap(c.register));
router.post('/login', authLimiter, wrap(c.login));
router.post('/logout', wrap(c.logout));
router.get('/me', requireAuth, wrap(c.me));
router.patch('/me', requireAuth, wrap(c.updateMe));
router.patch('/password', requireAuth, authLimiter, wrap(c.changePassword));

export default router;
