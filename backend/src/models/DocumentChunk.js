import mongoose from 'mongoose';
import { EMBEDDING_DIMENSIONS } from '../config/constants.js';

const chunkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    chunkIndex: { type: Number, required: true, min: 0 },
    content: { type: String, required: true },
    embedding: {
      type: [Number], required: true, select: false,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === EMBEDDING_DIMENSIONS,
        message: `Embedding must have ${EMBEDDING_DIMENSIONS} dimensions`,
      },
    },
    pageNumber: { type: Number, default: null },
    sectionHeading: { type: String, default: null, maxlength: 300 },
    tokenCount: { type: Number, required: true },
    metadata: {
      pageStart: Number,
      pageEnd: Number,
      fileName: String,
      strategy: String,
    },
  },
  { timestamps: true }
);
chunkSchema.index({ document: 1, chunkIndex: 1 }, { unique: true });
chunkSchema.index({ user: 1, document: 1 });

export const DocumentChunk = mongoose.model('DocumentChunk', chunkSchema);
