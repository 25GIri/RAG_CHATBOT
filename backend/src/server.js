import fs from 'node:fs/promises';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';
import { startQueue, recoverUnfinished } from './queue/processDocumentJob.js';
import { documentQueue } from './queue/documentQueue.js';
import { logger } from './utils/logger.js';

await fs.mkdir(env.storageRoot, { recursive: true });
await connectDb();
startQueue();
await recoverUnfinished();

const server = createApp().listen(env.port, () => logger.info(`API listening on :${env.port} (${env.nodeEnv})`));

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  server.close();
  await Promise.race([documentQueue.drained(), new Promise((r) => setTimeout(r, 15000))]);
  await disconnectDb();
  process.exit(0);
}
['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
