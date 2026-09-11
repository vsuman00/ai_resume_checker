import { afterEach, describe, expect, it } from "vitest";
import {
  cacheAnalysisResult,
  clearCachedAnalysisResults,
  getCachedAnalysisResult,
  setCachedAnalysisResult,
} from "../../app/lib/server/result-cache";

const result = { feedback: { overallScore: 75 } } as AnalysisResult;

afterEach(clearCachedAnalysisResults);

describe("MVP result cache", () => {
  it("returns a cached result by its server-generated ID", () => {
    const id = cacheAnalysisResult(result, 1_000);
    expect(getCachedAnalysisResult(id, 1_001)).toBe(result);
  });

  it("removes results after the bounded lifetime", () => {
    const id = cacheAnalysisResult(result, 1_000);
    expect(getCachedAnalysisResult(id, 3_601_000)).toBeUndefined();
  });

  it("stores a result under a durable analysis ID", () => {
    setCachedAnalysisResult("analysis-1", result, 1_000);
    expect(getCachedAnalysisResult("analysis-1", 1_001)).toBe(result);
  });
});
