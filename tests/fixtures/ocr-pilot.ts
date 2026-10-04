import { createHash } from "node:crypto";
import { createOcrSyntheticFixture } from "./ocr-synthetic";

// Correlated diagnostics only: translated/modified copies are NOT independent
// source families, held-out calibration or the representative release corpus.
type Segment = "clean" | "challenging" | "mixed" | "controls";
function rebuild(objects: string[], tag: string) {
  let pdf = `%PDF-1.4\n% diagnostic-${tag}\n`;
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj${object}endobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
function downsample(object: string, factor: number) {
  const dimensions = object.match(/\/Width (\d+) \/Height (\d+)/)!;
  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);
  const nextWidth = Math.ceil(width / factor);
  const nextHeight = Math.ceil(height / factor);
  const stride = Math.ceil(width / 8);
  const nextStride = Math.ceil(nextWidth / 8);
  const hex = object.match(/stream\n([a-f0-9]+)>\nendstream/)![1];
  const pixels = Buffer.from(hex, "hex");
  const next = new Uint8Array(nextStride * nextHeight).fill(255);
  for (let y = 0; y < nextHeight; y++) {
    for (let x = 0; x < nextWidth; x++) {
      const originalX = x * factor;
      const originalY = y * factor;
      if (
        !(
          pixels[originalY * stride + Math.floor(originalX / 8)] &
          (128 >> (originalX % 8))
        )
      )
        next[y * nextStride + Math.floor(x / 8)] &= ~(128 >> (x % 8));
    }
  }
  const nextHex = Buffer.from(next).toString("hex") + ">";
  return object
    .replace(dimensions[0], `/Width ${nextWidth} /Height ${nextHeight}`)
    .replace(/\/Length \d+/, `/Length ${nextHex.length}`)
    .replace(/stream\n[a-f0-9]+>\nendstream/, `stream\n${nextHex}\nendstream`);
}

function variant(segment: Segment, transform: string, index = 0) {
  const kind =
    segment === "mixed" || transform.includes("provider_output")
      ? "mixed"
      : transform === "native_control"
        ? "native"
        : "scanned";
  const source = createOcrSyntheticFixture(kind);
  let expectedPageTexts: string[] | null = source.expectedPageTexts;
  let labels = source.labels;
  const objects = [
    ...new TextDecoder()
      .decode(source.bytes)
      .matchAll(/\d+ 0 obj([\s\S]*?)endobj/g),
  ].map((match) => match[1]);
  for (let page = 0; page < source.pageMethods.length; page++) {
    if (source.pageMethods[page] !== "image_only") continue;
    const contentIndex = 4 + page * 3;
    const stream = objects[contentIndex].match(
      /stream\n([\s\S]*?)\nendstream/,
    )![1];
    let transformed = stream.replace(
      "42 550 cm",
      `${42 + index * 3} ${550 - index * 5} cm`,
    );
    if (transform.startsWith("skew_")) {
      const matrix = transformed.match(/q ([\d.]+) 0 0 ([\d.]+)/)!;
      const shear =
        Number(matrix[1]) * (transform === "skew_positive" ? 0.12 : -0.12);
      transformed = transformed.replace(
        matrix[0],
        `q ${matrix[1]} ${shear} 0 ${matrix[2]}`,
      );
    }
    if (transform.startsWith("rotate_")) {
      const matrix = transformed.match(
        /q ([\d.]+) 0 0 ([\d.]+) [\d.]+ [\d.]+ cm/,
      )!;
      transformed =
        transform === "rotate_90"
          ? transformed.replace(
              matrix[0],
              `q 0 ${matrix[1]} -${matrix[2]} 0 350 300 cm`,
            )
          : transformed.replace(
              matrix[0],
              `q -${matrix[1]} 0 0 -${matrix[2]} 550 700 cm`,
            );
    }
    if (transform.startsWith("downsample_"))
      objects[contentIndex + 1] = downsample(
        objects[contentIndex + 1],
        Number(transform.split("_")[1]),
      );
    if (transform === "blank_control") transformed = "q Q";
    objects[contentIndex] = objects[contentIndex]
      .replace(/\/Length \d+/, `/Length ${transformed.length}`)
      .replace(stream, transformed);
  }
  let bytes = rebuild(objects, `${segment}-${transform}-${index}`);
  if (transform === "blank_control") {
    expectedPageTexts = [""];
    labels = [];
  }
  if (transform === "corrupt_input") {
    bytes = new TextEncoder().encode(
      "%PDF-1.4\nINTENTIONALLY INVALID SYNTHETIC INPUT",
    );
    expectedPageTexts = null;
    labels = [];
  }
  if (transform === "oversized_input") {
    bytes = new Uint8Array(10 * 1024 * 1024 + 1).fill(32);
    bytes.set(
      new TextEncoder().encode("%PDF-1.4\nSYNTHETIC OVERSIZED CONTROL"),
    );
    expectedPageTexts = null;
    labels = [];
  }
  return {
    id: `diagnostic-${segment}-${transform}-${index}`,
    bytes,
    segment,
    transform,
    expectedPageTexts,
    labels,
    expectedOutcome: transform.includes("provider_output")
      ? "invalid_output"
      : transform === "corrupt_input" || transform === "oversized_input"
        ? "safe_failure"
        : transform === "native_control"
          ? "not_needed"
          : transform === "blank_control"
            ? "insufficient"
            : "review_required",
    sourceImageDpi: transform.startsWith("downsample_")
      ? 144 / Number(transform.split("_")[1])
      : 144,
    declaredSkewDegrees: transform.startsWith("skew_")
      ? (Math.atan(transform === "skew_positive" ? 0.12 : -0.12) * 180) /
        Math.PI
      : 0,
    declaredRotationDegrees: transform.startsWith("rotate_")
      ? Number(transform.split("_")[1])
      : 0,
    executionEvidence: transform.includes("provider_output")
      ? "contract_injection_only"
      : "source_fixture_only",
    providerPageInjection:
      transform === "duplicate_provider_output"
        ? [1, 1, 3]
        : transform === "missing_provider_output"
          ? [1]
          : null,
    manifest: {
      ...source.manifest,
      id: `diagnostic-${segment}-${transform}-${index}`,
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      representativeValidity: "not_evaluated",
      independentFamilyProtocol: "not_satisfied",
      qualityGate: "not_evaluated",
      variantOfSourceSha256: source.manifest.sourceSha256,
    },
  };
}
export function createOcrDiagnosticPilot() {
  return [
    ...Array.from({ length: 6 }, (_, index) =>
      variant("clean", "translation", index),
    ),
    ...[
      "skew_positive",
      "skew_negative",
      "rotate_90",
      "rotate_180",
      "downsample_2",
      "downsample_4",
    ].map((name) => variant("challenging", name)),
    ...Array.from({ length: 6 }, (_, index) =>
      variant("mixed", "translation", index),
    ),
    ...[
      "native_control",
      "blank_control",
      "corrupt_input",
      "oversized_input",
      "duplicate_provider_output",
      "missing_provider_output",
    ].map((name) => variant("controls", name)),
  ];
}
