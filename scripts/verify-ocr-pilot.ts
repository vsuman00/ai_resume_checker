import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import {
  createLocalContainerOcrAdapter,
  LOCAL_OCR_VERSIONS,
} from "../app/lib/server/ocr/local-container";
import {
  extractPdfTextLayers,
  detectPdfTextProfile,
} from "../app/lib/server/ocr/pdf-detection";
import {
  runSelectiveLocalOcr,
  type LocalOcrAdapter,
  type SelectiveOcrRequest,
} from "../app/lib/server/ocr/selective";
import { createOcrDiagnosticPilot } from "../tests/fixtures/ocr-pilot";
import {
  evaluateOcrDocument,
  summarizeOcrSegment,
  type OcrObservation,
} from "../tests/fixtures/ocr-evaluation";

const imageId = process.argv[2];
assert.match(
  imageId ?? "",
  /^sha256:[a-f0-9]{64}$/u,
  "Pass the reviewed immutable local image ID; no images are built or downloaded.",
);
assert.ok(
  process.argv.slice(3).every((arg) => arg === "--require-quality"),
  "Unknown checker option",
);
const docker = promisify(execFile);
async function ownedContainers() {
  const { stdout } = await docker(
    "docker",
    ["ps", "--all", "--quiet", "--filter", "label=resumide.ocr.attempt"],
    { timeout: 3000 },
  );
  return stdout.trim().split(/\s+/u).filter(Boolean);
}
async function assertCleanup(baseline: string[]) {
  const deadline = performance.now() + 7000;
  do {
    if ((await ownedContainers()).every((id) => baseline.includes(id))) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (performance.now() < deadline);
  throw new Error(
    "New owned OCR containers remain; no broad cleanup attempted.",
  );
}

const fixtures = createOcrDiagnosticPilot();
// Bind every authored hash and label before the first recognition. This is a
// development receipt, NOT a held-out lock or independent-family partition.
const sourceManifest = fixtures.map((fixture) => ({
  ...fixture.manifest,
  segment: fixture.segment,
  transform: fixture.transform,
  labelsSha256: createHash("sha256")
    .update(JSON.stringify(fixture.labels))
    .digest("hex"),
}));
const manifestSha256 = createHash("sha256")
  .update(JSON.stringify(sourceManifest))
  .digest("hex");
const baseline = await ownedContainers();
const results: Array<
  OcrObservation & { segment: string; [key: string]: unknown }
> = [];
for (const fixture of fixtures) {
  const started = performance.now();
  // Corrupt/oversized controls intentionally bypass the native extractor to
  // test the runtime input boundary directly; never label them successful PDFs.
  const nativePageTexts =
    fixture.expectedPageTexts === null
      ? [""]
      : (
          await extractPdfTextLayers(fixture.bytes, {
            maxPages: 10,
            maxCharacters: 100_000,
          })
        ).pageTexts;
  const originalNative = structuredClone(nativePageTexts);
  const profile = detectPdfTextProfile({
    pageTexts: nativePageTexts,
    totalPages: nativePageTexts.length,
    text: nativePageTexts.join("\n"),
  });
  const request: SelectiveOcrRequest = {
    schemaVersion: "selective-ocr-request-v1",
    attemptId: randomUUID(),
    ownerId: randomUUID(),
    analysisId: randomUUID(),
    sourceId: randomUUID(),
    createdAt: new Date().toISOString(),
    retentionPolicyId: "synthetic-local-30d/1.0.0",
    sourceSha256: fixture.manifest.sourceSha256,
    nativePageTexts,
    limits: { maxCharacters: 100_000, maxPages: 10 },
    selectedPages: profile.pagesNeedingOcr.map((pageNumber) => ({
      pageNumber,
      pageId: `page-${pageNumber}`,
    })),
    remainingDeadlineMs: 15_000,
    allocation: {
      id: "owner-approved-synthetic-local-2026-10-04",
      maxWallTimeMs: 10_000,
      maxPages: 10,
      externalApiFeeMicros: 0,
    },
    policy: {
      executionMode: "self_hosted",
      purpose: "synthetic_local_test",
      allowThirdPartyProcessing: false,
    },
  };
  const adapter: LocalOcrAdapter = fixture.providerPageInjection
    ? {
        versions: LOCAL_OCR_VERSIONS,
        async recognize() {
          return {
            durationMs: 1,
            pages: fixture.providerPageInjection!.map((pageNumber) => ({
              pageNumber,
              pageId: `page-${pageNumber}`,
              imageSha256: "0".repeat(64),
              widthPixels: 100,
              heightPixels: 100,
              rotation: 0,
              text: "",
              words: [],
            })),
          };
        },
      }
    : createLocalContainerOcrAdapter({ bytes: fixture.bytes, imageId });
  const outcome = await runSelectiveLocalOcr(
    request,
    adapter,
    new AbortController().signal,
  );
  await assertCleanup(baseline);
  assert.deepEqual(
    nativePageTexts,
    originalNative,
    "Native evidence must remain immutable.",
  );
  if (fixture.segment === "mixed")
    assert.deepEqual(
      request.selectedPages.map((page) => page.pageNumber),
      [1, 3],
    );
  if (
    outcome.status === "review_required" ||
    outcome.status === "insufficient"
  ) {
    assert.equal(outcome.scoringEligible, false);
    assert.deepEqual(
      outcome.pages.map((page) => page.pageNumber),
      profile.pagesNeedingOcr,
    );
  }
  if (fixture.transform === "native_control")
    assert.equal(outcome.status, "not_needed");
  if (fixture.transform === "blank_control")
    assert.equal(outcome.status, "insufficient");
  if (fixture.expectedPageTexts === null || fixture.providerPageInjection) {
    assert.equal(outcome.status, "failed");
    if (outcome.status === "failed")
      assert.equal(
        outcome.code,
        fixture.providerPageInjection ? "invalid_output" : "engine_failure",
      );
  }
  const actual = originalNative.slice();
  if (outcome.status === "review_required" || outcome.status === "insufficient")
    for (const page of outcome.pages) actual[page.pageNumber - 1] = page.text;
  const metrics = evaluateOcrDocument(fixture.expectedPageTexts ?? [], actual);
  const ocrMetrics = evaluateOcrDocument(
    profile.pagesNeedingOcr.map(
      (page) => fixture.expectedPageTexts?.[page - 1] ?? "",
    ),
    profile.pagesNeedingOcr.map((page) => actual[page - 1] ?? ""),
  );
  const recoveredLabels = fixture.labels.filter((label) =>
    (actual[label.pageNumber - 1] ?? "").includes(label.value),
  ).length;
  results.push({
    id: fixture.manifest.id,
    family: fixture.manifest.sourceFamily,
    segment: fixture.segment,
    transform: fixture.transform,
    sourceSha256: fixture.manifest.sourceSha256,
    executionEvidence: fixture.providerPageInjection
      ? "contract_injection_only"
      : "local_runtime_boundary",
    status: outcome.status,
    errorCode: outcome.status === "failed" ? outcome.code : null,
    selectedPages: request.selectedPages.map((page) => page.pageNumber),
    wallMs: performance.now() - started,
    // Expected workload, not measured engine attempts or billable usage.
    expectedRuntimeAttempts:
      fixture.providerPageInjection ||
      !request.selectedPages.length ||
      fixture.transform === "oversized_input"
        ? 0
        : 1,
    nativePreservation: "verified",
    cleanup: "verified",
    metrics,
    ocrMetrics,
    criticalValueTextRecovery: {
      recovered: recoveredLabels,
      reference: fixture.labels.length,
      reason:
        "exact_source_value_substring_not_structured_field_precision_or_recall",
    },
    wordGeometry:
      outcome.status === "review_required" || outcome.status === "insufficient"
        ? "contract_validated"
        : "not_applicable",
  });
}
const completedAt = new Date();
const report = {
  status: "diagnostic_execution_completed",
  imageId,
  versions: LOCAL_OCR_VERSIONS,
  manifestSha256,
  completedAt: completedAt.toISOString(),
  rawExpiresAt: new Date(completedAt.getTime() + 30 * 86400000).toISOString(),
  persistedRawAssets: false,
  datasetType: "synthetic_engineering_only",
  partition: "development",
  humanValidation: "not_evaluated",
  independentFamilyProtocol: "not_satisfied",
  representativeValidity: "not_evaluated",
  fullAA1Gate: "open",
  selection: "revise_and_review_no_production_enablement",
  automaticRetries: 0,
  runtimeAttemptAccounting:
    "expected_workload_only_not_observed_engine_attempts",
  cpuTime: { value: null, reason: "not_measured" },
  peakMemory: { value: null, reason: "not_measured" },
  structuredFieldPrecisionRecall: {
    value: null,
    reason: "field_extractor_not_evaluated",
  },
  segments: ["clean", "challenging", "mixed"].map((segment) => ({
    segment,
    ...summarizeOcrSegment(
      results
        .filter((row) => row.segment === segment)
        .map((row) => ({
          ...row,
          metrics: row.ocrMetrics as ReturnType<typeof evaluateOcrDocument>,
        })),
      segment === "challenging" ? 0.03 : 0.01,
    ),
  })),
  controls: results.filter((row) => row.segment === "controls"),
  results,
};
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (
  process.argv.includes("--require-quality") &&
  report.segments.some((segment) => segment.screeningGate !== "passed")
)
  process.exitCode = 1;
