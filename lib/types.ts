export interface DocChunk {
  id: string;
  docId: string;
  specimenId: string;
  page: number;
  text: string;
  embedding?: number[];
}

export interface DocRecord {
  id: string;
  specimenId: string;
  filename: string;
  pageCount: number;
  fullText: string;
  status: "extracting" | "embedding" | "ready" | "error";
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  trace?: TraceStep[];
  citedSpecimenIds?: string[];
}

export interface TraceStep {
  step: number;
  kind: "thinking" | "tool_call" | "tool_result" | "final";
  label: string;
  detail?: string;
}
