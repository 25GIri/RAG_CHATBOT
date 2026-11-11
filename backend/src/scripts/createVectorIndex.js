import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { logger } from '../utils/logger.js';

await connectDb();
await DocumentChunk.createCollection().catch(() => {});
const coll = DocumentChunk.collection;
const existing = await coll.listSearchIndexes(env.rag.indexName).toArray();

if (existing.length) {
  logger.info(`Vector index "${env.rag.indexName}" already exists (status: ${existing[0].status}).`);
} else {
  await coll.createSearchIndex({
    name: env.rag.indexName,
    type: 'vectorSearch',
    definition: {
      fields: [
        { type: 'vector', path: 'embedding', numDimensions: env.embeddingDimensions, similarity: 'cosine' },
        { type: 'filter', path: 'user' },
        { type: 'filter', path: 'document' },
      ],
    },
  });
  logger.info(`Created vector index "${env.rag.indexName}". Atlas builds it in the background (usually under a minute).`);
}
await disconnectDb();
