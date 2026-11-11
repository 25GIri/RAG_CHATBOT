import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema(
  {
    index: Number,
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    documentName: String,
    chunk: { type: mongoose.Schema.Types.ObjectId },
    pageNumber: { type: Number, default: null },
    sectionHeading: { type: String, default: null },
    score: Number,
    snippet: String,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 60000 },
    sources: { type: [sourceSchema], default: [] },
    messageType: { type: String, enum: ['text', 'not_found', 'error'], default: 'text' },
  },
  { timestamps: true, toJSON: { transform: (_d, r) => { delete r.__v; return r; } } }
);
messageSchema.index({ conversation: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
