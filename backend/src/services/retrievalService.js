import { env } from '../config/env.js';
import { embedQuery } from './embeddingService.js';
import { vectorSearch } from './vectorSearchService.js';
import { mmr, fitContextBudget } from '../utils/ranking.js';

export { mmr, fitContextBudget };

/**
 * Retrieval pipeline: embed query -> vector search (user + document filters)
 * -> similarity threshold -> MMR rerank -> context budget.
 */
export async function retrieve({ userId, documentIds, query, topK = env.rag.topK, minScore = env.rag.minScore }) {
  const queryVector = await embedQuery(query);
  const hits = await vectorSearch({ userId, documentIds, queryVector, limit: Math.max(env.rag.fetchK, topK) });
  const relevant = hits.filter((h) => h.score >= minScore);
  const diverse = mmr(relevant, queryVector, topK, env.rag.mmrLambda);
  return fitContextBudget(diverse, env.rag.maxContextTokens).map(({ embedding, ...rest }) => rest);
}
