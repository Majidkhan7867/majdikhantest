"use client";

import React from "react";

const CITATION_PATTERN = /\[(DOC-\d{3}) p\.(\d+)\]/g;

export function renderWithCitations(
  text: string,
  onCiteClick: (specimenId: string) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  CITATION_PATTERN.lastIndex = 0;
  while ((match = CITATION_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <React.Fragment key={key++}>{text.slice(lastIndex, match.index)}</React.Fragment>
      );
    }
    const specimenId = match[1];
    const page = match[2];
    nodes.push(
      <button
        key={key++}
        onClick={() => onCiteClick(specimenId)}
        className="inline-flex items-center gap-1 align-middle mx-0.5 px-1.5 py-0.5 rounded bg-amber-light text-amber font-mono text-[11px] leading-none hover:bg-amber hover:text-white transition-colors"
        title={`Jump to ${specimenId}, page ${page}`}
      >
        {specimenId} · p.{page}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<React.Fragment key={key++}>{text.slice(lastIndex)}</React.Fragment>);
  }

  return nodes;
}
