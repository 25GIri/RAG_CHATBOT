import { Router } from 'express';
import * as c from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadFiles } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import { validateObjectId } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);
router.post('/upload', uploadLimiter, uploadFiles, wrap(c.upload));
router.get('/', wrap(c.list));
router.get('/:id', validateObjectId(), wrap(c.get));
router.delete('/:id', validateObjectId(), wrap(c.remove));
export default router;
