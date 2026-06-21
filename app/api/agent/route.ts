import { NextRequest, NextResponse } from "next/server";
import {
  generateContent,
  embedText,
  type FunctionDeclaration,
  type GeminiContent,
} from "@/lib/gemini";
import { cosineSimilarity } from "@/lib/similarity";

export const runtime = "nodejs";
export const maxDuration = 60;

interface IncomingChunk {
  id: string;
  docId: string;
  specimenId: string;
  page: number;
  text: string;
  embedding: number[];
}

interface IncomingDoc {
  id: string;
  specimenId: string;
  filename: string;
  pageCount: number;
  fullText: string;
}

interface TraceStep {
  step: number;
  kind: "tool_call" | "tool_result" | "final";
  label: string;
  detail?: string;
}

const MAX_ITERATIONS = 4;
const DOC_TRUNCATE_CHARS = 14000;

const TOOLS: FunctionDeclaration[] = [
  {
    name: "search_documents",
    description:
      "Semantically search across the uploaded documents (or a subset of them) for passages relevant to a query. Returns short excerpts tagged with their specimen ID and page number. Use this before answering any question about document content — never guess at what a document says.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What to search for, phrased as a natural-language question or topic (not just keywords).",
        },
        specimen_ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional list of specimen IDs (e.g. DOC-001) to restrict the search to. Omit to search all uploaded documents.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "summarize_document",
    description:
      "Produce a structured, faithful summary of exactly one uploaded document, identified by its specimen ID.",
    parameters: {
      type: "object",
      properties: {
        specimen_id: { type: "string", description: "e.g. DOC-001" },
      },
      required: ["specimen_id"],
    },
  },
  {
    name: "compare_documents",
    description:
      "Compare two or more uploaded documents by specimen ID, highlighting where they agree, disagree, or each contribute something unique.",
    parameters: {
      type: "object",
      properties: {
        specimen_ids: {
          type: "array",
          items: { type: "string" },
          description: "Two or more specimen IDs to compare, e.g. [\"DOC-001\", \"DOC-002\"]",
        },
      },
      required: ["specimen_ids"],
    },
  },
];

function buildSystemInstruction(documents: IncomingDoc[]): string {
  const docList = documents
    .map((d) => `- ${d.specimenId}: "${d.filename}" (${d.pageCount} pages)`)
    .join("\n");

  return `You are Assay, an agentic multi-document research assistant. You help the user understand, search across, and compare a set of documents they've uploaded.

Documents currently in the workspace:
${docList || "(none uploaded yet)"}

Rules:
1. You do not know the content of any document from memory. Always call a tool (search_documents, summarize_document, or compare_documents) before making claims about what a document says. You may call tools more than once across multiple steps if needed.
2. When you state a fact drawn from a document, cite it inline in the form [SPECIMEN_ID p.PAGE], e.g. [DOC-001 p.4]. Use the specimen ID and page returned by the tools — never invent one.
3. If the documents don't contain an answer, say so plainly instead of guessing.
4. Be concise and precise. Prefer short paragraphs or tight bullet points over padding.
5. Once you have enough information, respond with your final answer as plain text (no further tool calls).`;
}

function buildToolContext(
  chunks: IncomingChunk[],
  documents: IncomingDoc[]
) {
  const docBySpecimen = new Map(documents.map((d) => [d.specimenId, d]));

  async function searchDocuments(args: { query: string; specimen_ids?: string[] }) {
    const queryEmbedding = await embedText(args.query, "RETRIEVAL_QUERY");
    let pool = chunks;
    if (args.specimen_ids && args.specimen_ids.length > 0) {
      const allowed = new Set(args.specimen_ids);
      pool = chunks.filter((c) => allowed.has(c.specimenId));
    }

    const ranked = pool
      .map((c) => ({ ...c, score: cosineSimilarity(c.embedding, queryEmbedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return {
      results: ranked.map((r) => ({
        specimen_id: r.specimenId,
        page: r.page,
        excerpt: r.text,
      })),
    };
  }

  async function summarizeDocument(args: { specimen_id: string }) {
    const doc = docBySpecimen.get(args.specimen_id);
    if (!doc) {
      return { error: `No document found with specimen ID ${args.specimen_id}.` };
    }
    const text = doc.fullText.slice(0, DOC_TRUNCATE_CHARS);
    const { text: summary } = await generateContent({
      temperature: 0.2,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Summarize the following document in a structured way: a one-sentence overview, then 3-6 key points as short bullets (use "- " prefixes, no markdown headers). Be faithful to the source and don't add outside information.\n\nDocument "${doc.filename}":\n${text}`,
            },
          ],
        },
      ],
    });
    return { specimen_id: args.specimen_id, filename: doc.filename, summary };
  }

  async function compareDocuments(args: { specimen_ids: string[] }) {
    const docs = args.specimen_ids
      .map((id) => docBySpecimen.get(id))
      .filter((d): d is IncomingDoc => Boolean(d));

    if (docs.length < 2) {
      return { error: "Need at least two valid specimen IDs to compare." };
    }

    const docsBlock = docs
      .map(
        (d) =>
          `--- ${d.specimenId}: "${d.filename}" ---\n${d.fullText.slice(0, DOC_TRUNCATE_CHARS)}`
      )
      .join("\n\n");

    const { text: comparison } = await generateContent({
      temperature: 0.2,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Compare the following documents. Structure your answer as: (1) where they agree, (2) where they disagree or differ in approach/findings, (3) anything unique to just one of them. Reference each document by its specimen ID. Keep it tight.\n\n${docsBlock}`,
            },
          ],
        },
      ],
    });
    return { specimen_ids: args.specimen_ids, comparison };
  }

  return { searchDocuments, summarizeDocument, compareDocuments };
}

export async function POST(req: NextRequest) {
  try {
    const { query, history, documents, chunks } = (await req.json()) as {
      query: string;
      history: { role: "user" | "assistant"; text: string }[];
      documents: IncomingDoc[];
      chunks: IncomingChunk[];
    };

    if (!query || !documents || documents.length === 0) {
      return NextResponse.json(
        { error: "A query and at least one uploaded document are required." },
        { status: 400 }
      );
    }

    const tools = buildToolContext(chunks ?? [], documents);
    const systemInstruction = buildSystemInstruction(documents);

    const messages: GeminiContent[] = [
      ...(history ?? []).map((h) => ({
        role: h.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: h.text }],
      })),
      { role: "user", parts: [{ text: query }] },
    ];

    const trace: TraceStep[] = [];
    let stepCounter = 0;
    let finalText = "";

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const response = await generateContent({
        contents: messages,
        tools: TOOLS,
        systemInstruction,
      });

      if (response.functionCalls.length === 0) {
        finalText = response.text.trim();
        stepCounter += 1;
        trace.push({ step: stepCounter, kind: "final", label: "Composed final answer" });
        break;
      }

      messages.push({ role: "model", parts: response.parts });

      const responseParts = [];
      for (const call of response.functionCalls) {
        stepCounter += 1;
        trace.push({
          step: stepCounter,
          kind: "tool_call",
          label: friendlyToolLabel(call.name, call.args),
        });

        let result: Record<string, unknown>;
        try {
          if (call.name === "search_documents") {
            result = await tools.searchDocuments(
              call.args as { query: string; specimen_ids?: string[] }
            );
          } else if (call.name === "summarize_document") {
            result = await tools.summarizeDocument(call.args as { specimen_id: string });
          } else if (call.name === "compare_documents") {
            result = await tools.compareDocuments(
              call.args as { specimen_ids: string[] }
            );
          } else {
            result = { error: `Unknown tool ${call.name}` };
          }
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Tool execution failed." };
        }

        stepCounter += 1;
        trace.push({
          step: stepCounter,
          kind: "tool_result",
          label: friendlyResultLabel(call.name, result),
        });

        responseParts.push({
          functionResponse: { id: call.id, name: call.name, response: result },
        });
      }

      messages.push({ role: "user", parts: responseParts });
    }

    if (!finalText) {
      finalText =
        "I wasn't able to settle on a final answer within my step budget. Try narrowing the question or asking about fewer documents at once.";
    }

    const citedSpecimenIds = Array.from(
      new Set(Array.from(finalText.matchAll(/\b(DOC-\d{3})\b/g)).map((m) => m[1]))
    );

    return NextResponse.json({ answer: finalText, trace, citedSpecimenIds });
  } catch (err) {
    console.error("agent error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent run failed." },
      { status: 500 }
    );
  }
}

function friendlyToolLabel(name: string, args: Record<string, unknown>): string {
  if (name === "search_documents") {
    const q = typeof args.query === "string" ? args.query : "";
    return `Searching documents for "${truncate(q, 60)}"`;
  }
  if (name === "summarize_document") {
    return `Summarizing ${args.specimen_id ?? "document"}`;
  }
  if (name === "compare_documents") {
    const ids = Array.isArray(args.specimen_ids) ? args.specimen_ids.join(", ") : "";
    return `Comparing ${ids}`;
  }
  return `Calling ${name}`;
}

function friendlyResultLabel(name: string, result: Record<string, unknown>): string {
  if (result.error) return `Error: ${truncate(String(result.error), 80)}`;
  if (name === "search_documents") {
    const results = result.results as unknown[] | undefined;
    return `Found ${results?.length ?? 0} relevant excerpt${results?.length === 1 ? "" : "s"}`;
  }
  if (name === "summarize_document") return "Summary ready";
  if (name === "compare_documents") return "Comparison ready";
  return "Done";
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
