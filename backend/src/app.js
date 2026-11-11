import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import chatRoutes from './routes/chat.routes.js';
import { requireAuth } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { CHUNK_STRATEGIES, CHUNK_LIMITS } from './config/constants.js';

export function createApp() {
  const app = express();
  if (env.isProd) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin.split(','), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/config', requireAuth, (_req, res) =>
    res.json({
      chunking: { ...env.chunk, strategies: CHUNK_STRATEGIES, ...CHUNK_LIMITS },
      upload: { maxFileSizeMb: env.maxFileSizeMb, maxFiles: env.maxFilesPerUpload, types: ['pdf', 'doc', 'docx'] },
      retrieval: { topK: env.rag.topK, minScore: env.rag.minScore },
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/chat', chatRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
