import { CHUNK_STRATEGIES, CHUNK_LIMITS, CHARS_PER_TOKEN } from '../config/constants.js';
import { estimateTokens } from '../utils/tokenCounter.js';
import { cosine } from '../utils/vectors.js';

const SEPARATORS = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];

/** Flatten parsed pages into one string plus a span map (offset -> page/heading/type). */
export function buildFlatText(parsed) {
  let text = '';
  const spans = [];
  let heading = null;
  for (const page of parsed.pages) {
    for (const block of page.blocks) {
      if (text) text += '\n\n';
      const start = text.length;
      text += block.text;
      if (block.type === 'heading') heading = block.text;
      spans.push({ start, end: text.length, page: page.pageNumber, heading, type: block.type, level: block.level });
    }
  }
  return { text, spans };
}

function locate(spans, offset) {
  let lo = 0;
  let hi = spans.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (spans[mid].start <= offset) lo = mid; else hi = mid - 1;
  }
  return spans[lo];
}

/** Split text into atoms (<= maxChars) using progressively finer separators. */
export function splitRecursive(text, offset, maxChars, seps = SEPARATORS) {
  if (text.length <= maxChars) return [{ start: offset, end: offset + text.length }];
  const sep = seps.find((s) => text.includes(s));
  if (!sep) {
    const out = [];
    for (let i = 0; i < text.length; i += maxChars) {
      out.push({ start: offset + i, end: offset + Math.min(i + maxChars, text.length) });
    }
    return out;
  }
  const rest = seps.slice(seps.indexOf(sep) + 1);
  const parts = text.split(sep);
  const tail = sep.trimEnd().length;
  const out = [];
  let pos = 0;
  parts.forEach((part, idx) => {
    const start = pos;
    pos += part.length + sep.length;
    if (!part.trim()) return;
    const end = start + part.length + (idx < parts.length - 1 ? tail : 0);
    if (part.length > maxChars) out.push(...splitRecursive(part, offset + start, maxChars, rest));
    else out.push({ start: offset + start, end: offset + end });
  });
  return out;
}

/** Greedily pack ordered atoms into chunks with character overlap. */
export function mergeAtoms(atoms, maxChars, overlapChars, breakBefore = new Set()) {
  const chunks = [];
  let cur = [];
  let emittedEnd = -1;
  const emit = () => {
    if (!cur.length) return;
    const end = cur[cur.length - 1].end;
    if (end > emittedEnd) {
      chunks.push({ start: cur[0].start, end });
      emittedEnd = end;
    }
  };
  atoms.forEach((atom, i) => {
    const overflow = cur.length && atom.end - cur[0].start > maxChars;
    if (cur.length && (overflow || breakBefore.has(i))) {
      emit();
      const lastEnd = cur[cur.length - 1].end;
      const keep = [];
      for (let k = cur.length - 1; k >= 0 && lastEnd - cur[k].start <= overlapChars; k--) keep.unshift(cur[k]);
      while (keep.length && atom.end - keep[0].start > maxChars) keep.shift();
      cur = keep;
    }
    cur.push(atom);
  });
  emit();
  return chunks;
}

const fixedChunks = (text, maxChars, overlapChars) => {
  const step = Math.max(maxChars - overlapChars, 1);
  const out = [];
  for (let i = 0; i < text.length; i += step) {
    out.push({ start: i, end: Math.min(i + maxChars, text.length) });
    if (i + maxChars >= text.length) break;
  }
  return out;
};


function structureChunks(flat, maxChars, overlapChars) {
  const sections = [];
  let current = { atoms: [] };
  for (const span of flat.spans) {
    if (span.type === 'heading') {
      if (current.atoms.length) sections.push(current);
      current = { atoms: [] };
      continue;
    }
    const slice = flat.text.slice(span.start, span.end);
    if (slice.length > maxChars) current.atoms.push(...splitRecursive(slice, span.start, maxChars));
    else current.atoms.push({ start: span.start, end: span.end });
  }
  if (current.atoms.length) sections.push(current);
  return sections.flatMap((s) => mergeAtoms(s.atoms, maxChars, overlapChars));
}

function splitSentences(flat, maxChars) {
  const atoms = [];
  for (const span of flat.spans) {
    if (span.type === 'heading') continue;
    const slice = flat.text.slice(span.start, span.end);
    for (const m of slice.matchAll(/[^\n]+?(?:[.!?](?=\s|$)|(?=\n)|$)/g)) {
      if (!m[0].trim()) continue;
      const s = span.start + m.index;
      const e = s + m[0].length;
      if (m[0].length > maxChars) atoms.push(...splitRecursive(m[0], s, maxChars));
      else atoms.push({ start: s, end: e });
    }
  }
  return atoms;
}

async function semanticChunks(flat, maxChars, overlapChars, embed) {
  const sentences = splitSentences(flat, maxChars);
  if (sentences.length < 3 || sentences.length > 3000) {
    return mergeAtoms(sentences, maxChars, overlapChars);
  }
  const win = (i) => [sentences[i - 1], sentences[i], sentences[i + 1]]
    .filter(Boolean).map((a) => flat.text.slice(a.start, a.end)).join(' ');
  const vectors = await embed(sentences.map((_, i) => win(i)));
  const distances = [];
  for (let i = 0; i < vectors.length - 1; i++) distances.push(1 - cosine(vectors[i], vectors[i + 1]));
  const sorted = [...distances].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
  const minChars = maxChars * 0.3;
  const breaks = new Set();
  let groupStart = sentences[0].start;
  distances.forEach((d, i) => {
    const groupLen = sentences[i].end - groupStart;
    if (d >= threshold && groupLen >= minChars) {
      breaks.add(i + 1);
      groupStart = sentences[i + 1].start;
    }
  });
  return mergeAtoms(sentences, maxChars, overlapChars, breaks);
}


export function resolveOptions(options = {}, defaults = {}) {
  const strategy = options.strategy ?? defaults.strategy ?? 'structure';
  const size = Number(options.size ?? defaults.size ?? 800);
  const overlap = Number(options.overlap ?? defaults.overlap ?? 120);
  if (!CHUNK_STRATEGIES.includes(strategy)) throw new Error(`Unknown chunking strategy: ${strategy}`);
  if (!(size >= CHUNK_LIMITS.minSize && size <= CHUNK_LIMITS.maxSize)) {
    throw new Error(`Chunk size must be between ${CHUNK_LIMITS.minSize} and ${CHUNK_LIMITS.maxSize} tokens`);
  }
  if (!(overlap >= 0 && overlap <= size / 2)) throw new Error('Chunk overlap must be between 0 and half the chunk size');
  return { strategy, size, overlap };
}



/**
 * @param parsed output of parseDocument
 * @param options {strategy,size,overlap} sizes are in tokens
 * @param deps optional {embed} used by the semantic strategy
 */
export async function chunkDocument(parsed, options = {}, deps = {}) {
  const { strategy, size, overlap } = resolveOptions(options);
  const maxChars = size * CHARS_PER_TOKEN;
  const overlapChars = overlap * CHARS_PER_TOKEN;
  const flat = buildFlatText(parsed);

  let ranges;
  if (strategy === 'fixed') ranges = fixedChunks(flat.text, maxChars, overlapChars);
  else if (strategy === 'recursive') ranges = mergeAtoms(splitRecursive(flat.text, 0, maxChars), maxChars, overlapChars);
  else if (strategy === 'semantic') {
    const embed = deps.embed || (async (t) => (await import('./embeddingService.js')).embedTexts(t, { taskType: 'SEMANTIC_SIMILARITY' }));
    ranges = await semanticChunks(flat, maxChars, overlapChars, embed);
  } else ranges = structureChunks(flat, maxChars, overlapChars);

  const chunks = [];
  for (const r of ranges) {
    const content = flat.text.slice(r.start, r.end).trim();
    if (content.length < 20 && ranges.length > 1) continue;
    if (!content) continue;
    const startSpan = locate(flat.spans, r.start);
    const endSpan = locate(flat.spans, Math.max(r.end - 1, r.start));
    chunks.push({
      chunkIndex: chunks.length,
      content,
      pageNumber: startSpan.page,
      sectionHeading: startSpan.heading,
      tokenCount: estimateTokens(content),
      metadata: { pageStart: startSpan.page, pageEnd: endSpan.page, strategy },
    });
  }
  return chunks;
}
