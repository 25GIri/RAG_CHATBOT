import mongoose from 'mongoose';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { env } from '../config/env.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Atlas $vectorSearch with a mandatory pre-filter on the authenticated user
 * and the selected documents, so cross-user retrieval is impossible.
 * Requires the index created by `npm run create-index`.
 */
export async function vectorSearch({ userId, documentIds, queryVector, limit }) {
  if (!documentIds.length) return [];
  return DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: env.rag.indexName,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(limit * 20, 100),
        limit,
        filter: { user: oid(userId), document: { $in: documentIds.map(oid) } },
      },
    },
    {
      $project: {
        content: 1, pageNumber: 1, sectionHeading: 1, document: 1, chunkIndex: 1,
        tokenCount: 1, embedding: 1, score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);
}
