import rateLimit from 'express-rate-limit';

const json = (message) => ({ error: { message } });

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false,
  message: json('Too many requests. Please slow down.'),
});
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  message: json('Too many attempts. Try again in a few minutes.'),
});
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: json('Upload limit reached. Try again later.'),
});
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: json('You are sending messages too quickly.'),
});
