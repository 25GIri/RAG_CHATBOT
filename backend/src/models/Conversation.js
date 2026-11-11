import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, maxlength: 120, default: 'New chat' },
    selectedDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { transform: (_d, r) => { delete r.__v; return r; } } }
);
conversationSchema.index({ user: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
