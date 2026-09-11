import { randomUUID } from "node:crypto";

const MAX_CACHED_RESULTS = 100;
const RESULT_TTL_MS = 60 * 60 * 1000;

interface CachedResult {
  result: AnalysisResult;
  expiresAt: number;
}

const results = new Map<string, CachedResult>();

function removeExpiredResults(now: number) {
  for (const [id, cached] of results) {
    if (cached.expiresAt <= now) results.delete(id);
  }
}

export function cacheAnalysisResult(
  result: AnalysisResult,
  now = Date.now(),
): string {
  removeExpiredResults(now);
  while (results.size >= MAX_CACHED_RESULTS) {
    const oldestId = results.keys().next().value;
    if (!oldestId) break;
    results.delete(oldestId);
  }

  const id = randomUUID();
  results.set(id, { result, expiresAt: now + RESULT_TTL_MS });
  return id;
}

export function setCachedAnalysisResult(
  id: string,
  result: AnalysisResult,
  now = Date.now(),
): void {
  removeExpiredResults(now);
  results.set(id, { result, expiresAt: now + RESULT_TTL_MS });
}

export function getCachedAnalysisResult(
  id: string,
  now = Date.now(),
): AnalysisResult | undefined {
  const cached = results.get(id);
  if (!cached) return undefined;
  if (cached.expiresAt <= now) {
    results.delete(id);
    return undefined;
  }
  return cached.result;
}

export function clearCachedAnalysisResults() {
  results.clear();
}
