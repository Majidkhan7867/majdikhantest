import { NextRequest, NextResponse } from "next/server";
import { chunkDocument } from "@/lib/chunk";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported right now." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // pdf-parse's default export must be required from its internal entry
    // to avoid the package's debug self-test path running on import.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;

    let pageCount = 0;

    const data = await pdfParse(buffer, {
      // Insert a form-feed between pages so we can recover page numbers
      // for citations after the text is flattened.
      pagerender: async (pageData: {
        getTextContent: () => Promise<{ items: { str?: string }[] }>;
      }) => {
        pageCount += 1;
        const textContent = await pageData.getTextContent();
        const text = textContent.items.map((item) => item.str ?? "").join(" ");
        return `${text}\f`;
      },
    });

    const fullText: string = data.text || "";
    const chunks = chunkDocument(fullText);

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error:
            "Couldn't extract any readable text from this PDF. It may be a scanned image without OCR.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      filename: file.name,
      pageCount: pageCount || data.numpages || 1,
      fullText,
      chunks,
    });
  } catch (err) {
    console.error("extract error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to extract PDF text." },
      { status: 500 }
    );
  }
}
