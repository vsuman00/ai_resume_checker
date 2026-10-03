import { describe, expect, it } from "vitest";
import { extractPdfForAnalysis } from "../../app/lib/server/extraction-stage";
import { buildNativeEvidence } from "../../app/lib/server/native-evidence";

// Minimal synthetic PDF, generated in-memory with explicit object offsets.
function syntheticPdf(
  stream = "BT /F1 12 Tf 50 750 Td (Alex Example) Tj 0 -20 Td (alex@example.test) Tj 0 -20 Td (+1 202 555 0100) Tj ET",
  rotation = 0,
) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Rotate ${rotation} /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

describe("native PDF evidence", () => {
  it("extracts a real synthetic PDF and reconstructs every candidate assertion", async () => {
    const extracted = await extractPdfForAnalysis({
      bytes: syntheticPdf(),
      maxBytes: 10_000,
      maxPages: 2,
      maxCharacters: 10_000,
      timeoutMs: 5_000,
    });
    const graph = buildNativeEvidence(extracted.pageTexts);
    expect(graph).toEqual(buildNativeEvidence(extracted.pageTexts));
    expect(graph.pages).toHaveLength(1);
    expect(graph.assertions.map((assertion) => assertion.value)).toEqual([
      "Alex Example",
      "alex@example.test",
      "+1 202 555 0100",
    ]);
    for (const assertion of graph.assertions) {
      const span = graph.spans.find(
        (item) => item.id === assertion.evidence?.spanId,
      )!;
      const page = graph.pages.find((item) => item.id === span.pageId)!;
      expect(Array.from(page.text).slice(span.start, span.end).join("")).toBe(
        span.text,
      );
      expect(
        Array.from(span.text)
          .slice(assertion.evidence!.start, assertion.evidence!.end)
          .join(""),
      ).toBe(assertion.value);
      expect(assertion.state).toBe("review_required");
      expect(assertion.confidence).toBe("uncalibrated");
    }
  });

  it("uses Unicode code-point offsets and preserves page identity", () => {
    const graph = buildNativeEvidence([
      "😀 Notes\nalex@example.test",
      "Skills\nTypeScript",
    ]);
    const span = graph.spans.find((item) => item.text === "alex@example.test")!;
    expect(span.start).toBe(8);
    expect(span.pageId).toBe("page-1");
    expect(graph.spans.find((item) => item.text === "TypeScript")?.pageId).toBe(
      "page-2",
    );
  });

  it("keeps absent critical contact fields unevaluated", () => {
    const graph = buildNativeEvidence(["Skills\nTypeScript"]);
    for (const assertion of graph.assertions) {
      expect(assertion).toMatchObject({
        value: null,
        state: "not_evaluated",
        evidence: null,
      });
    }
  });
});

describe("native PDF layout extraction", () => {
  const limits = {
    maxBytes: 10_000,
    maxPages: 2,
    maxCharacters: 10_000,
    timeoutMs: 5_000,
    includeLayout: true,
  };

  it("preserves legacy text and reconstructs real single-column text runs", async () => {
    const extracted = await extractPdfForAnalysis({
      ...limits,
      bytes: syntheticPdf(),
    });
    const legacy = await extractPdfForAnalysis({
      ...limits,
      bytes: syntheticPdf(),
      includeLayout: false,
    });
    expect(extracted.pageTexts).toEqual(legacy.pageTexts);
    expect(legacy).not.toHaveProperty("nativeLayout");
    const page = extracted.nativeLayout!.pages[0];
    expect(page).toMatchObject({
      pageId: "page-1",
      width: 612,
      height: 792,
      rotation: 0,
      warnings: [],
      state: "uncalibrated",
    });
    for (const block of page.blocks) {
      expect(
        Array.from(extracted.pageTexts[0])
          .slice(block.start, block.end)
          .join(""),
      ).toBe(block.text);
      if (!block.text.trim()) continue;
      expect(block.box?.x).toBeGreaterThanOrEqual(0);
      expect(block.box?.y).toBeGreaterThanOrEqual(0);
      expect(block.box?.width).toBeGreaterThan(0);
      expect(block.box?.height).toBeGreaterThan(0);
    }
  });

  it("flags real multi-column ambiguity without silently rewriting source text", async () => {
    const bytes = syntheticPdf(
      "BT /F1 12 Tf 350 750 Td (Right column) Tj -300 0 Td (Left column) Tj ET",
    );
    const extracted = await extractPdfForAnalysis({ ...limits, bytes });
    const legacy = await extractPdfForAnalysis({
      ...limits,
      bytes,
      includeLayout: false,
    });
    expect(extracted.text).toBe(legacy.text);
    const page = extracted.nativeLayout!.pages[0];
    expect(page.warnings).toContain("ambiguous_columns_or_table");
    expect(page.state).toBe("review_required");
    expect(
      page.blocks
        .filter((block) => block.text.trim())
        .map((block) => block.text),
    ).toEqual(["Right column", "Left column"]);
  });

  it("normalizes rotated page coordinates while warning about reading direction", async () => {
    const extracted = await extractPdfForAnalysis({
      ...limits,
      bytes: syntheticPdf(undefined, 90),
    });
    const page = extracted.nativeLayout!.pages[0];
    expect(page).toMatchObject({ width: 792, height: 612, rotation: 90 });
    expect(page.warnings).toContain("unsupported_reading_direction");
    expect(page.blocks[0].box?.x).toBeGreaterThan(0.9);
    expect(page.blocks[0].box?.y).toBeCloseTo(50 / 612);
  });

  it("enforces existing page and character bounds on the opt-in path", async () => {
    await expect(
      extractPdfForAnalysis({ ...limits, bytes: syntheticPdf(), maxPages: 0 }),
    ).rejects.toMatchObject({ code: "PAGE_LIMIT" });
    await expect(
      extractPdfForAnalysis({
        ...limits,
        bytes: syntheticPdf(),
        maxCharacters: 4,
      }),
    ).rejects.toMatchObject({ code: "TEXT_LIMIT" });
  });
});
