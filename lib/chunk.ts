/**
 * Splits a single page's text into overlapping chunks suitable for embedding.
 * Keeps chunks paragraph-aware where possible so citations stay coherent.
 */
export function chunkPageText(
  text: string,
  maxChars = 1100,
  overlapChars = 150
): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);

    if (end < clean.length) {
      const lastBreak = clean.lastIndexOf(". ", end);
      if (lastBreak > start + maxChars * 0.5) {
        end = lastBreak + 1;
      }
    }

    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - overlapChars;
    if (start < 0) start = 0;
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Splits raw extracted PDF text (with form-feed page breaks) into
 * page-tagged chunks.
 */
export function chunkDocument(rawText: string): { page: number; text: string }[] {
  const pages = rawText.split("\f");
  const result: { page: number; text: string }[] = [];

  pages.forEach((pageText, idx) => {
    const pieces = chunkPageText(pageText);
    pieces.forEach((piece) => {
      result.push({ page: idx + 1, text: piece });
    });
  });

  return result;
}
