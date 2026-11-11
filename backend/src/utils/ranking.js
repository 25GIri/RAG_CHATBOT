import { cosine } from './vectors.js';

/** Maximal Marginal Relevance: balance relevance with diversity. */
export function mmr(candidates, queryVector, k, lambda) {
  const pool = candidates.map((c) => ({ c, rel: cosine(queryVector, c.embedding) }));
  const selected = [];
  while (selected.length < k && pool.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    pool.forEach((p, i) => {
      const redundancy = selected.length ? Math.max(...selected.map((s) => cosine(p.c.embedding, s.c.embedding))) : 0;
      const score = lambda * p.rel - (1 - lambda) * redundancy;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    });
    selected.push(pool.splice(bestIdx, 1)[0]);
  }
  return selected.map((s) => s.c);
}

/** Keep chunks (in rank order) until the context token budget is used. */
export function fitContextBudget(chunks, maxTokens) {
  const out = [];
  let used = 0;
  for (const c of chunks) {
    if (used + c.tokenCount > maxTokens && out.length) break;
    out.push(c);
    used += c.tokenCount;
  }
  return out;
}
