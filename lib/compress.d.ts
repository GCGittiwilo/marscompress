export type CompressionRisk = "low" | "medium" | "high";

export interface CompressionBlock {
  index: number;
  heading: string;
  reason: string;
}

export interface CompressionAnnotation {
  index: number;
  text: string;
  kept: boolean;
  score: number;
  reason: string;
}

export interface CompressionResult {
  compressedText: string;
  originalTokens: number;
  keptTokens: number;
  tokensSaved: number;
  savingsPercent: number;
  importantKeptPercent: number;
  risk: CompressionRisk;
  latencyMs: number;
  keptBlocks: CompressionBlock[];
  droppedBlocks: CompressionBlock[];
  annotations: CompressionAnnotation[];
  policy: string;
}

export function estimateTokens(text: string): number;
export function segmentContext(context: string): string[];
export function compressContext(
  context: string,
  query: string,
  options?: { budgetRatio?: number },
): CompressionResult;

