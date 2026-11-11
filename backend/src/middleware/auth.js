import { verifyToken, getById } from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) throw ApiError.unauthorized();
    let payload;
    try { payload = verifyToken(token); } catch { throw ApiError.unauthorized('Session expired'); }
    const user = await getById(payload.sub);
    if (!user) throw ApiError.unauthorized();
    req.user = user;
    next();
  } catch (err) { next(err); }
}
