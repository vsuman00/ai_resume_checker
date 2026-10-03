import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ enabled: false, rpc: vi.fn() }));
vi.mock("../../app/lib/server/config", () => ({
  getAnalysisConfig: () => ({
    NATIVE_EVIDENCE_ENABLED: mocks.enabled,
    MAX_UPLOAD_BYTES: 1_000,
    MAX_PDF_PAGES: 2,
    MAX_EXTRACTED_CHARACTERS: 10_000,
    EXTRACTION_TIMEOUT_MS: 1_000,
  }),
}));
vi.mock("../../app/lib/server/storage", () => ({
  createResumeStorage: () => ({ download: async () => new Uint8Array([1]) }),
}));
vi.mock("../../app/lib/server/supabase", () => ({
  createSupabaseAdminClient: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              status: "extracting",
              resume_versions: { storage_key: "owned.pdf" },
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));
vi.mock("../../app/lib/server/ocr/pdf-detection", () => ({
  extractPdfTextLayers: async () => ({
    totalPages: 1,
    text: "Alex Example\nalex@example.test",
    pageTexts: ["Alex Example\nalex@example.test"],
  }),
  detectPdfTextProfile: () => ({ documentType: "text" }),
}));

import { processExtractionStage } from "../../app/lib/server/extraction-stage";

describe("native evidence worker rollout", () => {
  beforeEach(() => {
    mocks.enabled = false;
    mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null });
  });

  it("keeps the legacy RPC signature while disabled", async () => {
    await processExtractionStage("owned-analysis");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][0]).toBe("persist_analysis_extraction");
    expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty("p_evidence_graph");
  });

  it("persists grounded native evidence when enabled", async () => {
    mocks.enabled = true;
    await processExtractionStage("owned-analysis");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "persist_analysis_extraction",
      expect.objectContaining({
        p_analysis_id: "owned-analysis",
        p_evidence_graph: expect.objectContaining({
          schemaVersion: "native-evidence-v1",
          assertions: expect.arrayContaining([
            expect.objectContaining({
              field: "email",
              value: "alex@example.test",
              state: "review_required",
            }),
          ]),
        }),
      }),
    );
  });

  it("does not report successful extraction when persistence fails", async () => {
    mocks.enabled = true;
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(processExtractionStage("owned-analysis")).rejects.toThrow(
      "Extraction persistence failed.",
    );
  });
});
