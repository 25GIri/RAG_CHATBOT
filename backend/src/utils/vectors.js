export function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
export const norm = (a) => Math.sqrt(dot(a, a));
export function cosine(a, b) {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
}
export function normalize(a) {
  const n = norm(a);
  return n === 0 ? a : a.map((x) => x / n);
}
