import { NextRequest, NextResponse } from "next/server";
import { embedBatch } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 20;

export async function POST(req: NextRequest) {
  try {
    const { texts, taskType } = (await req.json()) as {
      texts: string[];
      taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
    };

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: "No texts provided." }, { status: 400 });
    }

    const type = taskType ?? "RETRIEVAL_DOCUMENT";
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const slice = texts.slice(i, i + BATCH_SIZE);
      const batchResult = await embedBatch(slice, type);
      embeddings.push(...batchResult);
    }

    return NextResponse.json({ embeddings });
  } catch (err) {
    console.error("embed error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate embeddings." },
      { status: 500 }
    );
  }
}
