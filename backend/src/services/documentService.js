import fs from 'node:fs/promises';
import { Document } from '../models/Document.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { Conversation } from '../models/Conversation.js';
import { env } from '../config/env.js';
import { resolveInside } from '../utils/safePath.js';
import { matchesSignature } from '../utils/fileSignature.js';
import { resolveOptions } from './chunkingService.js';
import { documentQueue } from '../queue/documentQueue.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const unlink = (p) => fs.unlink(p).catch((e) => { if (e.code !== 'ENOENT') logger.warn('File cleanup failed:', e.message); });

/** Create records for uploaded files (already on disk via multer) and queue processing. */
export async function createFromUploads(userId, files, rawOptions = {}) {
  let options;
  try {
    options = resolveOptions(
      { strategy: rawOptions.strategy || undefined, size: rawOptions.chunkSize || undefined, overlap: rawOptions.chunkOverlap || undefined },
      env.chunk
    );
  } catch (err) {
    await Promise.all(files.map((f) => unlink(f.path)));
    throw ApiError.badRequest(err.message);
  }

  const created = [];
  try {
    for (const file of files) {
      const ext = file.fileType;
      if (!(await matchesSignature(file.path, ext))) {
        throw ApiError.badRequest(`"${file.originalname}" is not a valid ${ext.toUpperCase()} file`);
      }
      const doc = await Document.create({
        user: userId,
        originalName: file.originalname.slice(0, 255),
        fileType: ext,
        fileSize: file.size,
        storagePath: file.relativePath,
        metadata: { chunkingStrategy: options.strategy, chunkSize: options.size, chunkOverlap: options.overlap },
      });
      created.push(doc);
    }
  } catch (err) {
    // All-or-nothing: remove files and records from this request.
    await Promise.all(files.map((f) => unlink(f.path)));
    await Document.deleteMany({ _id: { $in: created.map((d) => d._id) } });
    throw err;
  }
  created.forEach((d) => documentQueue.enqueue(d._id));
  return created;
}

export const list = (userId) => Document.find({ user: userId }).sort({ createdAt: -1 });

export async function getOwned(userId, id) {
  const doc = await Document.findOne({ _id: id, user: userId });
  if (!doc) throw ApiError.notFound('Document not found');
  return doc;
}

/** Remove the file, all chunks/embeddings, and references in conversations. */
export async function remove(userId, id) {
  const doc = await Document.findOne({ _id: id, user: userId }).select('+storagePath');
  if (!doc) throw ApiError.notFound('Document not found');
  documentQueue.remove(doc._id);
  await DocumentChunk.deleteMany({ document: doc._id, user: userId });
  await Conversation.updateMany({ user: userId, selectedDocuments: doc._id }, { $pull: { selectedDocuments: doc._id } });
  await unlink(resolveInside(env.storageRoot, doc.storagePath));
  await Document.deleteOne({ _id: doc._id });
}

export const counts = async (userId) => {
  const [total, ready] = await Promise.all([
    Document.countDocuments({ user: userId }),
    Document.countDocuments({ user: userId, processingStatus: 'ready' }),
  ]);
  return { total, ready };
};
