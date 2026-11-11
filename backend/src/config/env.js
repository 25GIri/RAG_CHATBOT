import 'dotenv/config';
import path from 'node:path';
import { EMBEDDING_DIMENSIONS } from './constants.js';

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};
const num = (key, fallback) => {
  const raw = process.env[key];
  const n = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(n) ? n : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: num('PORT', 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  geminiApiKey: required('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  embeddingDimensions: EMBEDDING_DIMENSIONS,
  storageRoot: path.resolve(process.env.STORAGE_DIR || './storage'),
  maxFileSizeMb: num('MAX_FILE_SIZE_MB', 20),
  maxFilesPerUpload: num('MAX_FILES_PER_UPLOAD', 5),
  queueConcurrency: num('QUEUE_CONCURRENCY', 2),
  chunk: {
    strategy: process.env.CHUNK_STRATEGY || 'structure',
    size: num('CHUNK_SIZE', 800),
    overlap: num('CHUNK_OVERLAP', 120),
  },
  rag: {
    topK: num('RAG_TOP_K', 6),
    fetchK: num('RAG_FETCH_K', 24),
    minScore: num('RAG_MIN_SCORE', 0.65),
    maxContextTokens: num('RAG_MAX_CONTEXT_TOKENS', 6000),
    historyWindow: num('RAG_HISTORY_WINDOW', 6),
    mmrLambda: num('RAG_MMR_LAMBDA', 0.7),
    indexName: process.env.VECTOR_INDEX_NAME || 'chunk_vector_index',
  },
};
