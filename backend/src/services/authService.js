import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials({ name, email, password }, requireName) {
  if (requireName && !(typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 80)) {
    throw ApiError.badRequest('Name is required (max 80 characters)');
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) throw ApiError.badRequest('A valid email is required');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw ApiError.badRequest('Password must be 8 to 128 characters');
  }
}

export const signToken = (userId) => jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

export async function register(body) {
  validateCredentials(body, true);
  const email = body.email.trim().toLowerCase();
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  const password = await bcrypt.hash(body.password, 12);
  const user = await User.create({ name: body.name.trim(), email, password });
  return { user, token: signToken(user._id) };
}

export async function login({ email, password }) {
  if (typeof email !== 'string' || typeof password !== 'string') throw ApiError.badRequest('Email and password are required');
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw ApiError.unauthorized('Invalid email or password');
  return { user, token: signToken(user._id) };
}

export const getById = (id) => User.findById(id);

export async function updateProfile(userId, { name }) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) throw ApiError.badRequest('Name is required (max 80 characters)');
  return User.findByIdAndUpdate(userId, { name: name.trim() }, { new: true, runValidators: true });
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    throw ApiError.badRequest('New password must be 8 to 128 characters');
  }
  const user = await User.findById(userId).select('+password');
  if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.password))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
}
