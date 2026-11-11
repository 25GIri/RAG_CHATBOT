import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkDocument, splitRecursive, mergeAtoms, resolveOptions } from '../src/services/chunkingService.js';
import { linesToBlocks, detectHeading } from '../src/services/documentParserService.js';

const para = (n, word = 'retrieval') => Array.from({ length: n }, (_, i) => `${word} sentence number ${i}.`).join(' ');

const parsed = {
  pages: [
    { pageNumber: 1, blocks: [
      { type: 'heading', level: 1, text: 'Introduction' },
      { type: 'paragraph', level: 0, text: para(8) },
      { type: 'heading', level: 1, text: 'Methods' },
      { type: 'paragraph', level: 0, text: para(8, 'method') },
    ] },
    { pageNumber: 2, blocks: [
      { type: 'heading', level: 1, text: 'Results' },
      { type: 'paragraph', level: 0, text: para(80, 'result') },
    ] },
  ],
};

test('structure strategy keeps headings and page numbers', async () => {
  const chunks = await chunkDocument(parsed, { strategy: 'structure', size: 100, overlap: 20 });
  assert.ok(chunks.length >= 4);
  assert.equal(chunks[0].sectionHeading, 'Introduction');
  assert.equal(chunks[0].pageNumber, 1);
  const results = chunks.filter((c) => c.sectionHeading === 'Results');
  assert.ok(results.length > 1, 'large section should be split recursively');
  assert.ok(results.every((c) => c.pageNumber === 2));
  chunks.forEach((c, i) => assert.equal(c.chunkIndex, i));
});

test('no chunk exceeds the configured size', async () => {
  for (const strategy of ['fixed', 'recursive', 'structure']) {
    const chunks = await chunkDocument(parsed, { strategy, size: 100, overlap: 20 });
    assert.ok(chunks.every((c) => c.content.length <= 100 * 4 + 1), `${strategy} exceeded size`);
  }
});

test('overlap repeats trailing text in the next chunk', async () => {
  const chunks = await chunkDocument(parsed, { strategy: 'recursive', size: 100, overlap: 30 });
  const shared = chunks.slice(1).some((c, i) => {
    const tail = chunks[i].content.slice(-40);
    return c.content.includes(tail.slice(-20));
  });
  assert.ok(shared);
});

test('semantic strategy splits at embedding distance jumps', async () => {
  const fake = async (texts) => texts.map((t) => (t.includes('alpha') ? [1, 0] : [0, 1]));
  const doc = { pages: [{ pageNumber: 1, blocks: [{ type: 'paragraph', level: 0, text:
    Array.from({ length: 12 }, () => 'alpha alpha topic here.').join(' ') + ' ' +
    Array.from({ length: 12 }, () => 'beta beta other here.').join(' ') }] }] };
  const chunks = await chunkDocument(doc, { strategy: 'semantic', size: 400, overlap: 0 }, { embed: fake });
  assert.ok(chunks.length >= 2);
});

test('option validation rejects bad values', () => {
  assert.throws(() => resolveOptions({ size: 10 }));
  assert.throws(() => resolveOptions({ size: 800, overlap: 500 }));
  assert.throws(() => resolveOptions({ strategy: 'nope' }));
});

test('splitRecursive offsets map back to source text', () => {
  const text = 'One. Two sentences here. Three is longer than the rest of them.';
  const atoms = splitRecursive(text, 0, 25);
  atoms.forEach((a) => assert.ok(text.slice(a.start, a.end).length <= 25));
  assert.ok(mergeAtoms(atoms, 25, 0).length >= 2);
});

test('heading detection and paragraph reconstruction', () => {
  assert.ok(detectHeading('1.2 Data Collection'));
  assert.ok(detectHeading('RESULTS AND DISCUSSION'));
  assert.equal(detectHeading('this is an ordinary sentence in the middle of a paragraph.'), null);
  const blocks = linesToBlocks('INTRODUCTION\nRAG combines retrieval with gener-\nation to ground answers.\n');
  assert.equal(blocks[0].type, 'heading');
  assert.match(blocks[1].text, /generation to ground/);
});
