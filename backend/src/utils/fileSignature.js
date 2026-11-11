import fs from 'node:fs/promises';

const SIGNATURES = {
  pdf: [Buffer.from('%PDF')],
  docx: [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  doc: [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
};

/** Check magic bytes so a renamed executable can't pass as a PDF. */
export async function matchesSignature(absPath, fileType) {
  const handle = await fs.open(absPath, 'r');
  try {
    const buf = Buffer.alloc(8);
    await handle.read(buf, 0, 8, 0);
    return (SIGNATURES[fileType] || []).some((sig) => buf.subarray(0, sig.length).equals(sig));
  } finally {
    await handle.close();
  }
}
