import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';

// The key lives only on the server; the frontend never sees it.
export const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
