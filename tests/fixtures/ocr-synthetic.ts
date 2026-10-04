import { createHash } from "node:crypto";

// Original, deliberately simple 5x7 block glyphs authored for these fixtures.
// No downloaded fonts, candidate data, OCR output or binary corpus assets.
const GLYPHS: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01111 10000 10000 10000 10000 10000 01111",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01111 10000 10000 10111 10001 10001 01111",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "11111 00100 00100 00100 00100 00100 11111",
  J: "00111 00010 00010 00010 10010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001",
  L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001",
  N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 10101 01010",
  X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100",
  Z: "11111 00001 00010 00100 01000 10000 11111",
  "0": "01110 10001 10011 10101 11001 10001 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111",
  "4": "00010 00110 01010 10010 11111 00010 00010",
  ".": "00000 00000 00000 00000 00000 00100 00100",
  "@": "01110 10001 10111 10101 10111 10000 01111",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};

const CONTACT_LINES = [
  "DEMO CANDIDATE",
  "DEMO@EXAMPLE.TEST",
  "PHONE 0000000000",
  "INDIA SOFTWARE ENGINEERING",
];
const SKILL_LINES = ["SKILLS TYPESCRIPT SQL", "SYNTHETIC TEST ONLY"];
const EXPERIENCE_LINES = [
  "EMPLOYER FICTIONAL SOFTWARE",
  "ROLE SOFTWARE ENGINEER",
  "DATES 2022 2024",
  "EDUCATION BSC COMPUTER SCIENCE",
  "CERTIFICATION DEMO CERTIFICATE",
];

function bitmap(lines: string[]) {
  const scale = 4;
  const width = (Math.max(...lines.map((line) => line.length)) * 6 + 8) * scale;
  const height = (lines.length * 12 + 8) * scale;
  const stride = Math.ceil(width / 8);
  const pixels = new Uint8Array(stride * height).fill(255);
  lines.forEach((line, row) => {
    [...line].forEach((char, column) => {
      const glyph = GLYPHS[char];
      if (!glyph) throw new Error("Unspecified synthetic glyph");
      glyph.split(" ").forEach((bits, y) => {
        [...bits].forEach((bit, x) => {
          if (bit !== "1") return;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = (column * 6 + x + 4) * scale + dx;
              const py = (row * 12 + y + 4) * scale + dy;
              pixels[py * stride + Math.floor(px / 8)] &= ~(128 >> (px % 8));
            }
          }
        });
      });
    });
  });
  return { width, height, hex: Buffer.from(pixels).toString("hex") + ">" };
}

export function createOcrSyntheticFixture(
  kind: "scanned" | "mixed" | "native",
  scannedPageCount = 1,
) {
  if (
    !Number.isInteger(scannedPageCount) ||
    scannedPageCount < 1 ||
    scannedPageCount > 10 ||
    (kind !== "scanned" && scannedPageCount !== 1)
  )
    throw new Error("Invalid synthetic page count");
  const lines =
    kind === "mixed"
      ? [CONTACT_LINES, SKILL_LINES, EXPERIENCE_LINES]
      : Array.from(
          { length: kind === "scanned" ? scannedPageCount : 1 },
          () => CONTACT_LINES,
        );
  const pageMethods = lines.map((_, index) =>
    kind === "native" || (kind === "mixed" && index === 1)
      ? ("native_text" as const)
      : ("image_only" as const),
  );
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${lines.map((_, index) => `${4 + index * 3} 0 R`).join(" ")}] /Count ${lines.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  lines.forEach((pageLines, index) => {
    const pageId = 4 + index * 3;
    const native = pageMethods[index] === "native_text";
    const image = bitmap(pageLines);
    const stream = native
      ? `BT /F1 16 Tf 42 730 Td ${pageLines.map((line, lineIndex) => `${lineIndex ? "0 -24 Td " : ""}(${line}) Tj`).join(" ")} ET`
      : `q ${image.width / 2} 0 0 ${image.height / 2} 42 550 cm /Im1 Do Q`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> /XObject << /Im1 ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /ASCIIHexDecode /Length ${image.hex.length} >>\nstream\n${image.hex}\nendstream`,
    );
  });
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new TextEncoder().encode(pdf);
  const expectedPageTexts = lines.map((page) => page.join("\n"));
  const expectedFields = {
    name: "DEMO CANDIDATE",
    email: "DEMO@EXAMPLE.TEST",
    phone: "0000000000",
    ...(kind === "mixed"
      ? {
          employer: "FICTIONAL SOFTWARE",
          role: "SOFTWARE ENGINEER",
          dates: "2022 2024",
          education: "BSC COMPUTER SCIENCE",
          certification: "DEMO CERTIFICATE",
        }
      : {}),
  };
  const labels = Object.entries(expectedFields).map(([field, value]) => {
    const index = expectedPageTexts.findIndex((text) => text.includes(value));
    const start = expectedPageTexts[index].indexOf(value);
    return {
      field,
      value,
      pageNumber: index + 1,
      pageId: `authored-page-${index + 1}`,
      start,
      end: start + value.length,
      sourceReference: `authored-page-${index + 1}`,
      offsetUnit: "unicode_code_point",
    };
  });
  return {
    bytes,
    expectedPageTexts,
    pageMethods,
    expectedFields,
    labels,
    manifest: {
      id: `ocr-block-glyph-${kind}${scannedPageCount > 1 ? `-${scannedPageCount}-pages` : ""}-v1`,
      generatorVersion: "authored-block-pdf-v1",
      templateVersion: "authored-block-glyph-v1",
      sourceFamily: "authored-block-glyph-v1",
      nearDuplicateGroup: "authored-block-glyph-v1",
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      sourcePermission: "original_synthetic_generator_no_external_assets",
      purpose: "local_aa1_engineering_regression",
      accessGroup: "workspace_owner_and_authorized_local_agents",
      rawRetention: "30_days_after_evaluation",
      // No evaluation has run. The run manifest must bind a real expiry then.
      evaluationCompletedAt: null,
      expiresAt: null,
      expiryReason: "evaluation_not_started",
      deletionStatus: "no_persisted_corpus_assets",
      labelRevision: "authored-source-v1",
      datasetType: "synthetic_engineering_only",
      domain: "software_engineering",
      locale: "en-IN",
      partition: "development",
      annotatorType: "ai",
      modelIdentifier: "unknown",
      humanValidation: "not_evaluated",
      adjudication: "ai_review_only",
      humanAgreement: null,
      humanAgreementReason: "independent_human_labels_unavailable",
    },
  };
}
