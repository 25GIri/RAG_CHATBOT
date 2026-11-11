import * as conversations from '../services/conversationService.js';
import { answerQuestion } from '../services/ragService.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export async function create(req, res) {
  const conversation = await conversations.create(req.user._id, req.body || {});
  res.status(201).json({ conversation });
}
export async function list(req, res) {
  res.json({ conversations: await conversations.list(req.user._id) });
}
export async function update(req, res) {
  res.json({ conversation: await conversations.update(req.user._id, req.params.id, req.body || {}) });
}
export async function messages(req, res) {
  const conversation = await conversations.getOwned(req.user._id, req.params.id);
  res.json({ conversation, messages: await conversations.messages(req.user._id, req.params.id) });
}
export async function remove(req, res) {
  await conversations.remove(req.user._id, req.params.id);
  res.json({ ok: true });
}

/** Send a question. Streams Server-Sent Events by default; `stream:false` returns JSON. */
export async function sendMessage(req, res) {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content) throw ApiError.badRequest('Message content is required');
  if (content.length > 4000) throw ApiError.badRequest('Message is too long (max 4000 characters)');
  const { id } = req.params;
  await conversations.getOwned(req.user._id, id); // 404 before opening a stream

  if (req.body.stream === false) {
    let result;
    const assistantMessage = await answerQuestion({
      userId: req.user._id, conversationId: id, content, onEvent: (t, d) => { if (t === 'done') result = d; },
    });
    return res.json(result || { assistantMessage });
  }

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const controller = new AbortController();
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);

  try {
    await answerQuestion({ userId: req.user._id, conversationId: id, content, onEvent: send, signal: controller.signal });
  } catch (err) {
    logger.error('Chat stream failed:', err.message);
    if (!controller.signal.aborted) {
      const status = err.status === 429 || err.code === 429 ? 'The AI service is rate limited. Please retry shortly.' : null;
      send('error', { message: status || (err instanceof ApiError ? err.message : 'Could not generate an answer. Please try again.') });
    }
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}
