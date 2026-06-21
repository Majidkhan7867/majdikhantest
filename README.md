# Assay — Agentic Multi-Document Research & Q&A Assistant

Built for the GeeksforGeeks "Build with AI" workshop (KSA). Assay lets you upload several
PDFs ("specimens"), then asks Gemini to autonomously search, summarize, and compare across
them — with every claim cited back to a document and page number.

## What makes it "agentic"

Most RAG demos just stuff retrieved text into one prompt. Assay instead gives Gemini three
tools and lets it decide, turn by turn, which ones to call and in what order:

- `search_documents(query, specimen_ids?)` — semantic search over your uploaded PDFs
- `summarize_document(specimen_id)` — structured summary of one document
- `compare_documents(specimen_ids)` — agreement/disagreement/uniqueness across documents

The model can call these multiple times in a single turn (e.g. search, then compare, then
search again) before composing a final, cited answer. The right-hand "Agent trace" panel
shows this reasoning live, step by step.

## Architecture

```
Browser (React state)                 Vercel serverless functions
─────────────────────                 ───────────────────────────
Upload PDF  ───────────────────────▶  /api/extract   (pdf-parse → page-tagged text)
Chunks + embeddings kept in   ◀─────  /api/embed      (Gemini gemini-embedding-001)
React state for the session

Ask a question ────────────────────▶  /api/agent      (Gemini gemini-2.5-flash + tools)
                                       runs the tool-calling loop server-side,
                                       using the chunks/doc text sent from the browser
Answer + trace  ◀───────────────────
```

**Why no database?** Vercel's serverless functions are stateless between requests, so a
real product would back this with a vector DB (Vercel KV/Postgres + pgvector, Pinecone,
etc.). For a workshop prototype, documents and their embeddings are kept in the browser's
React state for the session and sent along with each question — simpler to ship, easy to
explain, and zero infra to configure. The "Extending this" section below covers how you'd
swap in real persistence.

## Tech stack

- Next.js 14 (App Router) — single repo, deploys to Vercel with zero config
- Gemini API — `gemini-2.5-flash` for the agent loop, `gemini-embedding-001` for retrieval
- `pdf-parse` for text extraction, with page boundaries preserved for citations
- Tailwind CSS, `lucide-react` icons, no other UI framework

## Local setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste your Gemini API key (https://aistudio.google.com/apikey)
npm run dev
```

Open http://localhost:3000, upload a PDF or two, and ask a question once they show "ready"
in the specimen tray.

## Deploying to Vercel

1. Push this repo to GitHub (see commands below).
2. Go to vercel.com → **Add New... → Project** → import your GitHub repo.
3. In the project's **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini API key
4. Deploy. Vercel auto-detects Next.js — no build settings to change.
5. Once live, your URL is what you submit for "Deployed web/app URL on Vercel".

```bash
git init
git add .
git commit -m "Assay: agentic multi-document research assistant"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

## Known limitations (good talking points for "Innovation" / "Technical Implementation")

- Session-only storage: refreshing the page clears uploaded documents. Swapping
  `lib/gemini.ts` calls and the chunk store for a real vector DB (e.g. Vercel Postgres +
  pgvector) would make this persistent and multi-session.
- PDF-only input for now; the `/api/extract` route is the place to add `.docx`/`.txt`
  support.
- Very large documents are truncated to ~14k characters for the `summarize_document` and
  `compare_documents` tools to keep latency reasonable — fine for papers/reports, not for
  entire books.
- No auth/multi-user separation — every visitor shares the same Gemini API key quota,
  which is appropriate for a demo, not for production.

## Project structure

```
app/
  page.tsx                 main UI (upload, chat, trace — client-side state)
  layout.tsx                fonts + metadata
  api/extract/route.ts      PDF → page-tagged text chunks
  api/embed/route.ts        text chunks → Gemini embeddings
  api/agent/route.ts        the agentic tool-calling loop
components/
  UploadZone.tsx, DocumentTray.tsx, ChatPanel.tsx, AgentTrace.tsx, CitationTag.tsx
lib/
  gemini.ts                 thin REST wrapper around the Gemini API
  chunk.ts                  page-aware text chunking
  similarity.ts              cosine similarity / top-K retrieval
  types.ts                   shared TypeScript types
```
