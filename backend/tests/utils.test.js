import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveInside } from '../src/utils/safePath.js';
import { cleanText } from '../src/utils/textCleaner.js';
import { estimateTokens } from '../src/utils/tokenCounter.js';
import { cosine, normalize } from '../src/utils/vectors.js';
import { mmr, fitContextBudget } from '../src/utils/ranking.js';

test('path traversal is blocked', () => {
  const root = path.resolve('/tmp/store');
  assert.equal(resolveInside(root, 'u1/a.pdf'), path.join(root, 'u1', 'a.pdf'));
  assert.throws(() => resolveInside(root, '../etc/passwd'));
  assert.throws(() => resolveInside(root, 'u1/../../secret'));
});

test('cleanText normalizes whitespace and hyphenation', () => {
  assert.equal(cleanText('hel-\nlo   world\r\n\r\n\r\n\r\nnext'), 'hello world\n\nnext');
});

test('token estimate', () => assert.equal(estimateTokens('a'.repeat(400)), 100));

test('vectors', () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.ok(Math.abs(Math.hypot(...normalize([3, 4])) - 1) < 1e-9);
});

test('MMR prefers diverse results over near-duplicates', () => {
  const q = [1, 0];
  const cands = [
    { id: 'a', embedding: [1, 0] },
    { id: 'dup', embedding: [0.999, 0.01] },
    { id: 'diverse', embedding: [0.7, 0.7] },
  ];
  const out = mmr(cands, q, 2, 0.3).map((c) => c.id);
  assert.deepEqual(out, ['a', 'diverse']);
});

test('context budget keeps at least one chunk and stops at the limit', () => {
  const chunks = [{ tokenCount: 500 }, { tokenCount: 500 }, { tokenCount: 500 }];
  assert.equal(fitContextBudget(chunks, 1200).length, 2);
  assert.equal(fitContextBudget([{ tokenCount: 9999 }], 100).length, 1);
});
