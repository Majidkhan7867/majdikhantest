"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, ListTree } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { renderWithCitations } from "./CitationTag";

export default function ChatPanel({
  messages,
  onSend,
  isThinking,
  hasDocuments,
  onCiteClick,
  onViewTrace,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isThinking: boolean;
  hasDocuments: boolean;
  onCiteClick: (specimenId: string) => void;
  onViewTrace: (messageId: string) => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed || isThinking || !hasDocuments) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-16">
            <p className="font-display italic text-xl text-ink">
              {hasDocuments ? "Ask something about your documents." : "Load a document to begin."}
            </p>
            <p className="text-sm text-faint mt-2 max-w-sm">
              Assay reads across everything in your specimen tray, cites exact pages, and can
              summarize or compare on request.
            </p>
          </div>
        )}

        <div className="space-y-5 py-4">
          {messages.map((m) => (
            <div key={m.id} className="animate-riseIn">
              {m.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-ink text-paper px-4 py-2.5 text-sm">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%]">
                  <div className="rounded-2xl rounded-bl-sm bg-surface border border-line px-4 py-3 text-[13.5px] leading-relaxed text-ink shadow-card whitespace-pre-wrap">
                    {renderWithCitations(m.text, onCiteClick)}
                  </div>
                  {m.trace && m.trace.length > 0 && (
                    <button
                      onClick={() => onViewTrace(m.id)}
                      className="mt-1.5 ml-1 inline-flex items-center gap-1 text-[11px] text-faint hover:text-teal transition-colors"
                    >
                      <ListTree size={11} />
                      {m.trace.length} step{m.trace.length === 1 ? "" : "s"} · view trace
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="max-w-[85%]">
              <div className="rounded-2xl rounded-bl-sm bg-surface border border-line px-4 py-3 text-sm text-faint shadow-card inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulseDot" />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-teal animate-pulseDot"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-teal animate-pulseDot"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-line">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-card focus-within:border-teal/60">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={!hasDocuments}
            placeholder={
              hasDocuments
                ? "Ask about, summarize, or compare your documents…"
                : "Upload a PDF first…"
            }
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-faint disabled:cursor-not-allowed max-h-32"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || isThinking || !hasDocuments}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-teal-dark transition-colors"
            aria-label="Send"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
