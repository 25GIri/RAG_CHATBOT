import fs from 'node:fs/promises';
import { cleanText, cleanInline } from '../utils/textCleaner.js';
import { ApiError } from '../utils/ApiError.js';

const decodeEntities = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

/** Heuristic heading detector for formats without semantic headings (PDF, DOC). */
export function detectHeading(line) {
  const t = line.trim();
  if (t.length < 3 || t.length > 100) return null;
  if (/[.,;:]$/.test(t)) return null;
  const words = t.split(/\s+/);
  if (words.length > 12) return null;

  const numbered = t.match(/^(\d+(?:\.\d+)*)[.)]?\s+\p{L}/u);
  if (numbered) return { level: Math.min(numbered[1].split('.').length, 6) };
  if (/^(chapter|section|part|appendix)\s+[\dIVXA-Z]+\b/i.test(t)) return { level: 1 };

  const letters = t.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 4 && letters === letters.toUpperCase() && words.length <= 10) return { level: 1 };

  const capitalized = words.filter((w) => /^\p{Lu}/u.test(w) || w.length <= 3).length;
  if (words.length <= 8 && capitalized === words.length && /^\p{Lu}/u.test(t) && words.length >= 2) {
    return { level: 2 };
  }
  return null;
}

/** Convert raw page text (line-broken) into heading/paragraph blocks. */
export function linesToBlocks(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const maxLen = Math.max(...lines.map((l) => l.length), 1);
  const blocks = [];
  let buf = '';
  const flush = () => {
    const t = cleanInline(buf);
    if (t) blocks.push({ type: 'paragraph', level: 0, text: t });
    buf = '';
  };
  for (const line of lines) {
    if (!line) { flush(); continue; }
    const h = detectHeading(line);
    if (h) { flush(); blocks.push({ type: 'heading', level: h.level, text: cleanInline(line) }); continue; }
    if (buf.endsWith('-') && /^\p{Ll}/u.test(line)) buf = buf.slice(0, -1) + line;
    else buf += (buf ? ' ' : '') + line;
    if (/[.!?:]$/.test(line) && line.length < maxLen * 0.7) flush();
  }
  flush();
  return blocks;
}

async function parsePdf(absPath) {
  // Import the lib file directly: the package index runs a debug routine under ESM.
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
  const buffer = await fs.readFile(absPath);
  const pageTexts = [];
  const data = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      let lastY;
      let text = '';
      for (const item of content.items) {
        const y = item.transform[5];
        if (lastY === undefined || lastY === y) text += item.str;
        else text += '\n' + item.str;
        lastY = y;
      }
      pageTexts[pageData.pageNumber - 1] = text;
      return text;
    },
  });
  const pages = [];
  for (let i = 0; i < (data.numpages || pageTexts.length); i++) {
    const blocks = linesToBlocks(cleanText(pageTexts[i] || ''));
    if (blocks.length) pages.push({ pageNumber: i + 1, blocks });
  }
  return { pages, pageCount: data.numpages, title: data.info?.Title || null };
}

function htmlToBlocks(html) {
  const blocks = [];
  const re = /<(h[1-6]|p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1];
    const inner = m[2];
    const text = cleanInline(decodeEntities(inner.replace(/<[^>]+>/g, '')));
    if (!text) continue;
    if (tag.startsWith('h')) {
      blocks.push({ type: 'heading', level: Number(tag[1]), text });
    } else {
      const boldOnly = /^<strong>[\s\S]*<\/strong>$/.test(inner.trim());
      const h = boldOnly ? detectHeading(text) || (text.length < 80 && !/[.!?]$/.test(text) ? { level: 3 } : null) : null;
      blocks.push(h ? { type: 'heading', level: h.level, text } : { type: 'paragraph', level: 0, text: tag === 'li' ? `• ${text}` : text });
    }
  }
  return blocks;
}

async function parseDocx(absPath) {
  const { default: mammoth } = await import('mammoth');
  const { value } = await mammoth.convertToHtml({ path: absPath });
  const blocks = htmlToBlocks(value);
  // DOCX has no fixed pagination, so page numbers are intentionally null.
  return { pages: blocks.length ? [{ pageNumber: null, blocks }] : [], pageCount: null, title: null };
}

async function parseDoc(absPath) {
  const { default: WordExtractor } = await import('word-extractor');
  const doc = await new WordExtractor().extract(absPath);
  const blocks = cleanText(doc.getBody())
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const h = detectHeading(line);
      return h ? { type: 'heading', level: h.level, text: line } : { type: 'paragraph', level: 0, text: cleanInline(line) };
    });
  return { pages: blocks.length ? [{ pageNumber: null, blocks }] : [], pageCount: null, title: null };
}

/** @returns {{pages:{pageNumber:number|null,blocks:{type:string,level:number,text:string}[]}[],pageCount:number|null,title:string|null}} */
export async function parseDocument(absPath, fileType) {
  const parsers = { pdf: parsePdf, docx: parseDocx, doc: parseDoc };
  const parser = parsers[fileType];
  if (!parser) throw ApiError.badRequest(`Unsupported file type: ${fileType}`);
  let parsed;
  try {
    parsed = await parser(absPath);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unprocessable(`Could not read this ${fileType.toUpperCase()} file. It may be corrupted or password-protected.`);
  }
  if (!parsed.pages.length) {
    throw ApiError.unprocessable('No extractable text found. Scanned documents need OCR first.');
  }
  return parsed;
}

export const parsedToPlainText = (parsed) =>
  parsed.pages.map((p) => p.blocks.map((b) => b.text).join('\n\n')).join('\n\n');
