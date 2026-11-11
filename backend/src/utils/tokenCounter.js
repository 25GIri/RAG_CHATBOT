import { CHARS_PER_TOKEN } from '../config/constants.js';

// Fast approximation (~4 chars/token). Good enough for chunk sizing and
// context budgeting without shipping a tokenizer dependency.
export const estimateTokens = (text = '') => Math.ceil(text.length / CHARS_PER_TOKEN);
export const tokensToChars = (tokens) => Math.floor(tokens * CHARS_PER_TOKEN);
