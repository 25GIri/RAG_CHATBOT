import { ai } from '../config/gemini.js';
import { env } from '../config/env.js';
import { normalize } from '../utils/vectors.js';
import { logger } from '../utils/logger.js';

const BATCH_SIZE = 50;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, retries = 5) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status ?? err?.code;
      const retryable = [408, 429, 500, 502, 503, 504].includes(Number(status));
      if (!retryable || attempt >= retries) throw err;
      const delay = Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500;
      logger.warn(`Gemini embedding retry ${attempt + 1} in ${Math.round(delay)}ms (status ${status})`);
      await sleep(delay);
      attempt++;
    }
  }
}

/**
 * Embed texts in batches. Vectors are L2-normalized because truncated
 * (768-dim) gemini-embedding outputs are not unit length by default.
 */
export async function embedTexts(texts, { taskType = 'RETRIEVAL_DOCUMENT', onProgress } = {}) {
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await withRetry(() =>
      ai.models.embedContent({
        model: env.embeddingModel,
        contents: batch,
        config: { taskType, outputDimensionality: env.embeddingDimensions },
      })
    );
    if (!res.embeddings || res.embeddings.length !== batch.length) {
      throw new Error('Embedding API returned an unexpected number of vectors');
    }
    out.push(...res.embeddings.map((e) => normalize(e.values)));
    onProgress?.(Math.min(i + BATCH_SIZE, texts.length), texts.length);
  }
  return out;
}

export async function embedQuery(text) {
  const [vec] = await embedTexts([text], { taskType: 'RETRIEVAL_QUERY' });
  return vec;
}
