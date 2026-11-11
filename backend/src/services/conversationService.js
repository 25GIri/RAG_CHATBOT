import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Document } from '../models/Document.js';
import { ApiError } from '../utils/ApiError.js';

async function assertOwnsDocuments(userId, ids = []) {
  if (!ids.length) return [];
  const unique = [...new Set(ids.map(String))];
  const count = await Document.countDocuments({ _id: { $in: unique }, user: userId });
  if (count !== unique.length) throw ApiError.badRequest('One or more selected documents were not found');
  return unique;
}

export async function create(userId, { title, selectedDocuments } = {}) {
  const docs = await assertOwnsDocuments(userId, selectedDocuments);
  return Conversation.create({ user: userId, title: title?.trim() || 'New chat', selectedDocuments: docs });
}

export const list = (userId) =>
  Conversation.find({ user: userId }).sort({ lastMessageAt: -1 }).limit(100).lean();

export async function getOwned(userId, id) {
  const conv = await Conversation.findOne({ _id: id, user: userId });
  if (!conv) throw ApiError.notFound('Conversation not found');
  return conv;
}

export async function update(userId, id, { title, selectedDocuments }) {
  const conv = await getOwned(userId, id);
  if (typeof title === 'string' && title.trim()) conv.title = title.trim().slice(0, 120);
  if (Array.isArray(selectedDocuments)) conv.selectedDocuments = await assertOwnsDocuments(userId, selectedDocuments);
  await conv.save();
  return conv;
}

export async function messages(userId, id) {
  await getOwned(userId, id);
  return Message.find({ conversation: id }).sort({ createdAt: 1 }).lean();
}

/** Short-term memory: only this conversation's latest messages, never other chats. */
export async function recentHistory(conversationId, limit) {
  const rows = await Message.find({ conversation: conversationId, messageType: { $ne: 'error' } })
    .sort({ createdAt: -1 }).limit(limit).lean();
  return rows.reverse().map((m) => ({ role: m.role, content: m.content }));
}

export const addMessage = (conversationId, data) => Message.create({ conversation: conversationId, ...data });

export async function touch(conversationId, firstQuestion, isFirst) {
  const set = { lastMessageAt: new Date() };
  if (isFirst) set.title = firstQuestion.replace(/\s+/g, ' ').slice(0, 60);
  return Conversation.findByIdAndUpdate(conversationId, set, { new: true });
}

export async function remove(userId, id) {
  await getOwned(userId, id);
  await Message.deleteMany({ conversation: id });
  await Conversation.deleteOne({ _id: id });
}
