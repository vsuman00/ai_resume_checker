import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const single = vi.fn();
  return { rpc, single };
});

vi.mock("../../app/lib/server/config", () => ({
  getAnalysisConfig: () => ({
    AI_ENABLED: true,
    AI_MONTHLY_TOKEN_LIMIT: 10_000,
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "test-model",
    OPENAI_MAX_OUTPUT_TOKENS: 1_000,
    OPENAI_TIMEOUT_MS: 50,
    QUALITATIVE_MAX_ATTEMPTS: 1,
  }),
}));

vi.mock("../../app/lib/server/supabase", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: mocks.single }),
      }),
    }),
    rpc: mocks.rpc,
  }),
}));

import { processQualitativeStage } from "../../app/lib/server/qualitative-stage";

describe("qualitative-stage provider outage", () => {
  it("persists a deterministic partial result after the first retryable failure", async () => {
    mocks.single.mockResolvedValue({
      data: {
        status: "qualitative_review",
        request_id: "request-1",
        organization_id: "org-1",
        jobs: { title: "Engineer", description: "Build software" },
        analysis_extractions: { extracted_text: "Candidate resume" },
        analysis_deterministic_results: {
          score: 74,
          rule_trace: [
            { passed: true, detail: "Email address was found." },
            { passed: false, detail: "Add a Skills section." },
            { passed: true, detail: "Dates are parseable." },
          ],
        },
      },
      error: null,
    });
    mocks.rpc
      .mockResolvedValueOnce({ data: 0, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    const persisted = await processQualitativeStage("analysis-1", 1, {
      execute: vi.fn().mockRejectedValue({ status: 503 }),
    });

    expect(persisted).toBe(false);
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "persist_partial_analysis",
      expect.objectContaining({
        p_analysis_id: "analysis-1",
        p_feedback: expect.objectContaining({
          overallScore: 74,
          ATS: expect.objectContaining({ score: 74 }),
        }),
      }),
    );
  });
});
