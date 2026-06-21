"use client";

import React from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";
import type { DocRecord } from "@/lib/types";
import UploadZone from "./UploadZone";

export default function DocumentTray({
  documents,
  onFiles,
  activeSpecimenId,
  uploading,
}: {
  documents: DocRecord[];
  onFiles: (files: File[]) => void;
  activeSpecimenId: string | null;
  uploading: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="font-display text-lg italic text-ink">Specimen tray</h2>
        <p className="text-xs text-faint mt-0.5">
          {documents.length === 0
            ? "No documents yet"
            : `${documents.length} document${documents.length === 1 ? "" : "s"} loaded`}
        </p>
      </div>

      <UploadZone onFiles={onFiles} disabled={uploading} />

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
        {documents.map((doc) => (
          <div
            id={`specimen-${doc.specimenId}`}
            key={doc.id}
            className={`rounded-lg border bg-surface p-3 shadow-card transition-all ${
              activeSpecimenId === doc.specimenId
                ? "border-teal ring-2 ring-teal/30"
                : "border-line"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-teal-light text-teal-dark font-medium">
                {doc.specimenId}
              </span>
              <StatusIcon status={doc.status} />
            </div>
            <div className="mt-2 flex items-start gap-1.5">
              <FileText size={13} className="mt-0.5 shrink-0 text-faint" />
              <p className="text-xs text-ink leading-snug break-words line-clamp-2">
                {doc.filename}
              </p>
            </div>
            <p className="mt-1.5 text-[11px] text-faint">
              {doc.status === "ready"
                ? `${doc.pageCount} pages indexed`
                : doc.status === "extracting"
                ? "Reading text…"
                : doc.status === "embedding"
                ? "Building index…"
                : doc.error}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: DocRecord["status"] }) {
  if (status === "ready") return <CheckCircle2 size={14} className="text-teal" />;
  if (status === "error") return <AlertCircle size={14} className="text-amber" />;
  return <Loader2 size={14} className="text-faint animate-spin" />;
}
