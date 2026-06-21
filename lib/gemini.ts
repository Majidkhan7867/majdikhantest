const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const CHAT_MODEL = "gemini-2.5-flash";
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your environment variables (see README)."
    );
  }
  return key;
}

export interface GeminiPart {
  text?: string;
  functionCall?: { id?: string; name: string; args: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Calls Gemini generateContent, optionally with tools + a system instruction. */
export async function generateContent(opts: {
  contents: GeminiContent[];
  tools?: FunctionDeclaration[];
  systemInstruction?: string;
  temperature?: number;
}): Promise<{
  parts: GeminiPart[];
  text: string;
  functionCalls: { id?: string; name: string; args: Record<string, unknown> }[];
}> {
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: { temperature: opts.temperature ?? 0.3 },
  };

  if (opts.tools && opts.tools.length > 0) {
    body.tools = [{ functionDeclarations: opts.tools }];
  }
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  const res = await fetch(`${API_BASE}/${CHAT_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini generateContent failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts: GeminiPart[] = candidate?.content?.parts ?? [];

  const text = parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text)
    .join("");

  const functionCalls = parts
    .filter((p) => p.functionCall)
    .map((p) => p.functionCall as { id?: string; name: string; args: Record<string, unknown> });

  return { parts, text, functionCalls };
}

/** Embeds a single string of text. */
export async function embedText(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[]> {
  const res = await fetch(`${API_BASE}/${EMBED_MODEL}:embedContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getApiKey(),
    },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: EMBED_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini embedContent failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.embedding?.values ?? [];
}

/** Embeds a batch of strings (max ~50 per Gemini's batch limits). */
export async function embedBatch(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetch(`${API_BASE}/${EMBED_MODEL}:batchEmbedContents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getApiKey(),
    },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBED_DIMENSIONS,
      })),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini batchEmbedContents failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.embeddings ?? []).map((e: { values: number[] }) => e.values);
}

export const GEMINI_MODELS = { CHAT_MODEL, EMBED_MODEL, EMBED_DIMENSIONS };
