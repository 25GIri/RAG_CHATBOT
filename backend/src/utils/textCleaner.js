/** Normalize extracted text: unicode, control chars, whitespace, hyphenation. */
export function cleanText(input = '') {
  return String(input)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u00A0\t]+/g, ' ')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const cleanInline = (s = '') => cleanText(s).replace(/\s*\n\s*/g, ' ');
