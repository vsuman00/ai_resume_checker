export const AnalysisStatuses = [
  "created",
  "uploading",
  "quarantined",
  "queued",
  "extracting",
  "needs_ocr",
  "scoring",
  "qualitative_review",
  "partial",
  "completed",
  "failed",
  "cancelled",
  "rejected",
] as const;

export type AnalysisStatus = (typeof AnalysisStatuses)[number];

const transitions: Record<AnalysisStatus, readonly AnalysisStatus[]> = {
  created: ["uploading", "cancelled"],
  uploading: ["quarantined", "cancelled"],
  quarantined: ["queued", "rejected", "failed"],
  queued: ["extracting", "cancelled", "failed"],
  extracting: ["scoring", "needs_ocr", "failed"],
  needs_ocr: ["scoring", "failed"],
  scoring: ["qualitative_review", "failed"],
  qualitative_review: ["completed", "partial", "failed"],
  partial: [],
  completed: [],
  failed: [],
  cancelled: [],
  rejected: [],
};

export function canTransitionAnalysis(
  current: AnalysisStatus,
  next: AnalysisStatus,
): boolean {
  return transitions[current].includes(next);
}
