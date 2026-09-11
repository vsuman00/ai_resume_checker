import { processExtractionStage } from "./extraction-stage";
import { processQualitativeStage } from "./qualitative-stage";
import { processScoringStage } from "./scoring-stage";

export async function processQueuedAnalysis(
  analysisId: string,
  attempt: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;
  await processExtractionStage(analysisId);
  if (signal.aborted) return;
  await processScoringStage(analysisId);
  if (signal.aborted) return;
  await processQualitativeStage(analysisId, attempt);
}
