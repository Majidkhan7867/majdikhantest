export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function topKBySimilarity<T extends { embedding?: number[] }>(
  items: T[],
  queryEmbedding: number[],
  k: number
): (T & { score: number })[] {
  return items
    .filter((i) => i.embedding && i.embedding.length > 0)
    .map((i) => ({ ...i, score: cosineSimilarity(i.embedding as number[], queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
