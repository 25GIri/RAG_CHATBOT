import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (_req, _res, next) => next(ApiError.notFound('Route not found'));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Something went wrong';
  let details;

  if (err instanceof ApiError) {
    status = err.status; message = err.message; details = err.details;
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? `File is larger than ${env.maxFileSizeMb} MB` : err.message;
  } else if (err?.name === 'ValidationError') {
    status = 400; message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err?.name === 'CastError') {
    status = 400; message = 'Invalid identifier';
  } else if (err?.code === 11000) {
    status = 409; message = 'Duplicate value';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400; message = 'Malformed JSON body';
  } else if (err?.status === 429 || err?.code === 429) {
    status = 429; message = 'The AI service is rate limited. Please retry in a moment.';
  }

  if (status >= 500) logger.error(`${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) {
    if (!res.writableEnded) res.end();
    return;
  }
  res.status(status).json({ error: { message: status >= 500 && env.isProd ? 'Something went wrong' : message, details } });
}
