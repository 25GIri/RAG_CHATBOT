import mongoose from 'mongoose';
import { CHUNK_STRATEGIES } from '../config/constants.js';

const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    fileType: { type: String, required: true, enum: ['pdf', 'doc', 'docx'] },
    fileSize: { type: Number, required: true, min: 1 },
    storagePath: { type: String, required: true, select: false },
    extractedText: { type: String, select: false },
    processingStatus: {
      type: String, enum: ['uploaded', 'processing', 'ready', 'failed'], default: 'uploaded', index: true,
    },
    processingProgress: { type: Number, min: 0, max: 100, default: 0 },
    processingError: { type: String, maxlength: 500 },
    totalChunks: { type: Number, default: 0, min: 0 },
    metadata: {
      pageCount: Number,
      title: String,
      chunkingStrategy: { type: String, enum: CHUNK_STRATEGIES },
      chunkSize: Number,
      chunkOverlap: Number,
      textTruncated: Boolean,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => { delete ret.storagePath; delete ret.extractedText; delete ret.__v; return ret; },
    },
  }
);
documentSchema.index({ user: 1, createdAt: -1 });

export const Document = mongoose.model('Document', documentSchema);
