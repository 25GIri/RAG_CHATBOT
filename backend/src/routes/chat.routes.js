import { Router } from 'express';
import * as c from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { validateObjectId } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);
router.post('/conversations', wrap(c.create));
router.get('/conversations', wrap(c.list));
router.get('/conversations/:id/messages', validateObjectId(), wrap(c.messages));
router.post('/conversations/:id/messages', validateObjectId(), chatLimiter, wrap(c.sendMessage));
router.patch('/conversations/:id', validateObjectId(), wrap(c.update));
router.delete('/conversations/:id', validateObjectId(), wrap(c.remove));
export default router;
