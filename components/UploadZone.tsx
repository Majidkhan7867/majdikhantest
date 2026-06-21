"use client";

import React, { useCallback, useRef, useState } from "react";
import { FlaskConical, Upload } from "lucide-react";

export default function UploadZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );
      if (files.length > 0) onFiles(files);
    },
    [onFiles, disabled]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`group cursor-pointer rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed border-line"
          : isDragOver
          ? "border-teal bg-teal-light"
          : "border-line hover:border-teal/60 hover:bg-teal-light/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-2 text-muted">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card text-teal">
          {isDragOver ? <FlaskConical size={16} /> : <Upload size={16} />}
        </div>
        <p className="text-sm font-medium text-ink">Drop PDFs to add specimens</p>
        <p className="text-xs text-faint">or click to browse · multiple files supported</p>
      </div>
    </div>
  );
}
