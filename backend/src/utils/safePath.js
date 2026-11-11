import path from 'node:path';
import { ApiError } from './ApiError.js';

/** Resolve a relative storage path and guarantee it stays inside root (no traversal). */
export function resolveInside(root, relativePath) {
  const base = path.resolve(root);
  const target = path.resolve(base, relativePath);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new ApiError(400, 'Invalid file path');
  }
  return target;
}
