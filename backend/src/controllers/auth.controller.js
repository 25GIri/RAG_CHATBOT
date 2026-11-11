import * as auth from '../services/authService.js';
import { env } from '../config/env.js';

const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  maxAge: env.cookieMaxAgeMs,
  path: '/',
};
// SameSite=Lax blocks cross-site POSTs (CSRF). Set COOKIE_SAMESITE=none only if the API and SPA are on different sites.

const setCookie = (res, token) => res.cookie('token', token, cookieOptions);

export async function register(req, res) {
  const { user, token } = await auth.register(req.body || {});
  setCookie(res, token);
  res.status(201).json({ user });
}
export async function login(req, res) {
  const { user, token } = await auth.login(req.body || {});
  setCookie(res, token);
  res.json({ user });
}
export function logout(_req, res) {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
}
export const me = (req, res) => res.json({ user: req.user });
export async function updateMe(req, res) {
  res.json({ user: await auth.updateProfile(req.user._id, req.body || {}) });
}
export async function changePassword(req, res) {
  await auth.changePassword(req.user._id, req.body || {});
  res.json({ ok: true });
}
