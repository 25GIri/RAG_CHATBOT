import fs from 'node:fs/promises';
import { Document } from '../models/Document.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { env } from '../config/env.js';
import { resolveInside } from '../utils/safePath.js';
import { parseDocument, parsedToPlainText } from '../services/documentParserService.js';
import { chunkDocument } from '../services/chunkingService.js';
import { embedTexts } from '../services/embeddingService.js';
import { documentQueue } from './documentQueue.js';
import { logger } from '../utils/logger.js';

const MAX_STORED_TEXT = 5_000_000;
const setProgress = (id, progress) => Document.updateOne({ _id: id }, { processingProgress: progress });

/** Pipeline: parse -> clean -> chunk -> embed -> store -> mark ready. */
export async function processDocument(documentId) {
  const doc = await Document.findById(documentId).select('+storagePath');
  if (!doc) return;
  try {
    await Document.updateOne({ _id: doc._id }, { processingStatus: 'processing', processingProgress: 5, processingError: null });
    await DocumentChunk.deleteMany({ document: doc._id });

    const parsed = await parseDocument(resolveInside(env.storageRoot, doc.storagePath), doc.fileType);
    await setProgress(doc._id, 20);

    const options = {
      strategy: doc.metadata?.chunkingStrategy,
      size: doc.metadata?.chunkSize,
      overlap: doc.metadata?.chunkOverlap,
    };
    const chunks = await chunkDocument(parsed, options);
    if (!chunks.length) throw new Error('No usable text chunks were produced');
    await setProgress(doc._id, 35);

    // Prefix the section heading so the vector captures topic context.
    const inputs = chunks.map((c) => (c.sectionHeading ? `${c.sectionHeading}\n\n${c.content}` : c.content));
    let lastReported = 0;
    const vectors = await embedTexts(inputs, {
      taskType: 'RETRIEVAL_DOCUMENT',
      onProgress: (done, total) => {
        const pct = 35 + Math.round((done / total) * 55);
        if (pct - lastReported >= 5) { lastReported = pct; setProgress(doc._id, pct).catch(() => {}); }
      },
    });

    if (!(await Document.exists({ _id: doc._id }))) return; // deleted while processing

    const rows = chunks.map((c, i) => ({
      ...c,
      user: doc.user,
      document: doc._id,
      embedding: vectors[i],
      metadata: { ...c.metadata, fileName: doc.originalName },
    }));
    for (let i = 0; i < rows.length; i += 200) await DocumentChunk.insertMany(rows.slice(i, i + 200), { ordered: true });

    if (!(await Document.exists({ _id: doc._id }))) {
      await DocumentChunk.deleteMany({ document: doc._id });
      return;
    }
    const fullText = parsedToPlainText(parsed);
    await Document.updateOne(
      { _id: doc._id },
      {
        processingStatus: 'ready',
        processingProgress: 100,
        totalChunks: rows.length,
        extractedText: fullText.slice(0, MAX_STORED_TEXT),
        'metadata.pageCount': parsed.pageCount,
        'metadata.title': parsed.title,
        'metadata.textTruncated': fullText.length > MAX_STORED_TEXT,
      }
    );
    logger.info(`Processed "${doc.originalName}" into ${rows.length} chunks`);
  } catch (err) {
    logger.error(`Processing failed for ${doc._id}:`, err.message);
    await DocumentChunk.deleteMany({ document: doc._id }).catch(() => {});
    await Document.updateOne(
      { _id: doc._id },
      { processingStatus: 'failed', processingProgress: 0, processingError: String(err.message || 'Processing failed').slice(0, 500) }
    ).catch(() => {});
  }
}

export function startQueue() {
  documentQueue.setHandler(processDocument);
}

/** Re-queue anything left unfinished by a crash/restart. */
export async function recoverUnfinished() {
  const stuck = await Document.find({ processingStatus: { $in: ['uploaded', 'processing'] } }).select('_id');
  stuck.forEach((d) => documentQueue.enqueue(d._id));
  if (stuck.length) logger.info(`Re-queued ${stuck.length} unfinished document(s)`);
}
