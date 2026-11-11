import { ai } from '../config/gemini.js';
import { env } from '../config/env.js';

const toContents = (messages) =>
  messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

export async function generate({ system, messages, temperature = 0.2, signal }) {
  const res = await ai.models.generateContent({
    model: env.geminiModel,
    contents: toContents(messages),
    config: { systemInstruction: system, temperature, abortSignal: signal },
  });
  return res.text || '';
}

export async function* streamGenerate({ system, messages, temperature = 0.2, signal }) {
  const stream = await ai.models.generateContentStream({
    model: env.geminiModel,
    contents: toContents(messages),
    config: { systemInstruction: system, temperature, abortSignal: signal },
  });
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

/** Rewrite a follow-up ("what are its advantages?") into a standalone search query. */
export async function condenseQuestion(history, question) {
  if (!history.length) return question;
  const transcript = history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 600)}`)
    .join('\n');
  const text = await generate({
    system:
      'Rewrite the final user question as a single standalone search query, resolving pronouns and references using the conversation. ' +
      'Output only the rewritten question. If it is already standalone, repeat it unchanged. Do not answer it.',
    messages: [{ role: 'user', content: `Conversation:\n${transcript}\n\nFinal question: ${question}` }],
    temperature: 0,
  });
  const out = text.trim().replace(/^["']|["']$/g, '');
  return out && out.length < 600 ? out : question;
}
