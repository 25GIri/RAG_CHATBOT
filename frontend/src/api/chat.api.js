import { api, BASE_URL } from './axios.js';

export const listConversations = () => api.get('/chat/conversations').then((r) => r.data.conversations);
export const createConversation = (data) => api.post('/chat/conversations', data).then((r) => r.data.conversation);
export const updateConversation = (id, data) => api.patch(`/chat/conversations/${id}`, data).then((r) => r.data.conversation);
export const deleteConversation = (id) => api.delete(`/chat/conversations/${id}`);
export const getMessages = (id) => api.get(`/chat/conversations/${id}/messages`).then((r) => r.data);

/**
 * Stream an answer over Server-Sent Events. EventSource cannot POST, so we read
 * the fetch body stream and parse SSE frames by hand.
 */
export async function streamMessage(conversationId, content, { onStart, onToken, onDone, signal }) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop();
    for (const frame of frames) {
      let event = 'message';
      let data = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      const payload = JSON.parse(data);
      if (event === 'start') onStart?.(payload);
      else if (event === 'token') onToken?.(payload.text);
      else if (event === 'done') onDone?.(payload);
      else if (event === 'error') throw new Error(payload.message);
    }
  }
}
