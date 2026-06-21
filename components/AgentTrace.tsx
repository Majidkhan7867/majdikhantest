"use client";

import React from "react";
import { Search, FileSearch, GitCompareArrows, Sparkles, CircleDot } from "lucide-react";
import type { TraceStep } from "@/lib/types";

export default function AgentTrace({
  trace,
  isThinking,
}: {
  trace: TraceStep[];
  isThinking: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="font-display text-lg italic text-ink">Agent trace</h2>
        <p className="text-xs text-faint mt-0.5">Live record of tool calls and reasoning</p>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {trace.length === 0 && !isThinking && (
          <p className="text-xs text-faint italic mt-2">
            Ask a question to see Assay's steps here.
          </p>
        )}

        <ol className="relative space-y-0">
          {trace.map((step, idx) => (
            <li key={step.step} className="relative pl-6 pb-4 last:pb-0">
              {idx < trace.length - 1 && (
                <span className="absolute left-[9px] top-5 bottom-0 w-px bg-line" />
              )}
              <span className="absolute left-0 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface border border-line text-teal">
                <StepIcon kind={step.kind} label={step.label} />
              </span>
              <p className="text-[12px] leading-snug text-ink font-medium">{step.label}</p>
              {step.detail && (
                <p className="text-[11px] text-faint mt-0.5 font-mono">{step.detail}</p>
              )}
            </li>
          ))}

          {isThinking && (
            <li className="relative pl-6">
              <span className="absolute left-0 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-teal-light text-teal">
                <CircleDot size={11} className="animate-pulseDot" />
              </span>
              <p className="text-[12px] leading-snug text-muted font-mono animate-pulseDot">
                working…
              </p>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

function StepIcon({ kind, label }: { kind: TraceStep["kind"]; label: string }) {
  if (kind === "final") return <Sparkles size={11} />;
  if (label.toLowerCase().startsWith("comparing")) return <GitCompareArrows size={11} />;
  if (label.toLowerCase().startsWith("summarizing")) return <FileSearch size={11} />;
  return <Search size={11} />;
}
