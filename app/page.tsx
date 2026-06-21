"use client";

import React, { useState } from "react";
import { FlaskConical, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import DocumentTray from "@/components/DocumentTray";
import ChatPanel from "@/components/ChatPanel";
import AgentTrace from "@/components/AgentTrace";
import type { ChatMessage, DocChunk, DocRecord, TraceStep } from "@/lib/types";

export default function Home() {
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [chunks, setChunks] = useState<DocChunk[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeSpecimenId, setActiveSpecimenId] = useState<string | null>(null);
  const [liveTrace, setLiveTrace] = useState<TraceStep[]>([]);
  const [displayedTrace, setDisplayedTrace] = useState<TraceStep[]>([]);
  const [trayOpen, setTrayOpen] = useState(true);
  const [traceOpen, setTraceOpen] = useState(true);

  const readyDocCount = documents.filter((d) => d.status === "ready").length;

  async function handleFiles(files: File[]) {
    const startIndex = documents.length;

    const newDocs: DocRecord[] = files.map((f, i) => ({
      id: crypto.randomUUID(),
      specimenId: `DOC-${String(startIndex + i + 1).padStart(3, "0")}`,
      filename: f.name,
      pageCount: 0,
      fullText: "",
      status: "extracting",
    }));

    setDocuments((prev) => [...prev, ...newDocs]);

    await Promise.all(
      files.map(async (file, i) => {
        const doc = newDocs[i];
        try {
          const formData = new FormData();
          formData.append("file", file);
          const extractRes = await fetch("/api/extract", { method: "POST", body: formData });
          const extractData = await extractRes.json();
          if (!extractRes.ok) throw new Error(extractData.error ?? "Extraction failed");

          setDocuments((prev) =>
            prev.map((d) =>
              d.id === doc.id
                ? {
                    ...d,
                    fullText: extractData.fullText,
                    pageCount: extractData.pageCount,
                    status: "embedding",
                  }
                : d
            )
          );

          const pieces: { page: number; text: string }[] = extractData.chunks;
          const embedRes = await fetch("/api/embed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              texts: pieces.map((p) => p.text),
              taskType: "RETRIEVAL_DOCUMENT",
            }),
          });
          const embedData = await embedRes.json();
          if (!embedRes.ok) throw new Error(embedData.error ?? "Embedding failed");

          const newChunks: DocChunk[] = pieces.map((p, idx) => ({
            id: `${doc.id}-${idx}`,
            docId: doc.id,
            specimenId: doc.specimenId,
            page: p.page,
            text: p.text,
            embedding: embedData.embeddings[idx],
          }));

          setChunks((prev) => [...prev, ...newChunks]);
          setDocuments((prev) =>
            prev.map((d) => (d.id === doc.id ? { ...d, status: "ready" } : d))
          );
        } catch (err) {
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === doc.id
                ? {
                    ...d,
                    status: "error",
                    error: err instanceof Error ? err.message : "Something went wrong.",
                  }
                : d
            )
          );
        }
      })
    );
  }

  async function handleSend(text: string) {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    setLiveTrace([]);
    setDisplayedTrace([]);

    try {
      const readyDocs = documents.filter((d) => d.status === "ready");
      const readyChunks = chunks.filter((c) =>
        readyDocs.some((d) => d.id === c.docId)
      );

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          documents: readyDocs.map((d) => ({
            id: d.id,
            specimenId: d.specimenId,
            filename: d.filename,
            pageCount: d.pageCount,
            fullText: d.fullText,
          })),
          chunks: readyChunks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Agent run failed.");

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.answer,
        trace: data.trace,
        citedSpecimenIds: data.citedSpecimenIds,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setDisplayedTrace(data.trace ?? []);
    } catch (err) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: `Something went wrong: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleCiteClick(specimenId: string) {
    setActiveSpecimenId(specimenId);
    setTrayOpen(true);
    setTimeout(() => {
      document
        .getElementById(`specimen-${specimenId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setActiveSpecimenId(null), 2500);
  }

  function handleViewTrace(messageId: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (msg?.trace) {
      setDisplayedTrace(msg.trace);
      setTraceOpen(true);
    }
  }

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal text-white">
            <FlaskConical size={15} />
          </span>
          <div>
            <h1 className="font-display italic text-lg leading-none text-ink">Assay</h1>
            <p className="text-[10px] text-faint leading-none mt-0.5">
              Multi-document research, examined
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTrayOpen((v) => !v)}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-teal-light hover:text-teal-dark transition-colors"
            aria-label="Toggle document tray"
          >
            {trayOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
          <button
            onClick={() => setTraceOpen((v) => !v)}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-teal-light hover:text-teal-dark transition-colors"
            aria-label="Toggle agent trace"
          >
            {traceOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr_280px]">
        <aside
          className={`${
            trayOpen ? "block" : "hidden"
          } lg:block border-r border-line bg-surface/40 p-4 overflow-hidden lg:h-full absolute lg:relative z-20 w-full sm:w-80 lg:w-auto h-[calc(100vh-57px)] lg:z-auto`}
        >
          <DocumentTray
            documents={documents}
            onFiles={handleFiles}
            activeSpecimenId={activeSpecimenId}
            uploading={documents.some((d) => d.status !== "ready" && d.status !== "error")}
          />
        </aside>

        <section className="min-h-0 p-4">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            isThinking={isThinking}
            hasDocuments={readyDocCount > 0}
            onCiteClick={handleCiteClick}
            onViewTrace={handleViewTrace}
          />
        </section>

        <aside
          className={`${
            traceOpen ? "block" : "hidden"
          } lg:block border-l border-line bg-surface/40 p-4 overflow-hidden lg:h-full absolute right-0 lg:relative z-20 w-full sm:w-80 lg:w-auto h-[calc(100vh-57px)] lg:z-auto`}
        >
          <AgentTrace trace={displayedTrace.length ? displayedTrace : liveTrace} isThinking={isThinking} />
        </aside>
      </div>
    </main>
  );
}
