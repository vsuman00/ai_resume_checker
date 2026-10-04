import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createOcrDiagnosticPilot } from "../../fixtures/ocr-pilot";
import { extractPdfTextLayers } from "../../../app/lib/server/ocr/pdf-detection";

describe("24 document diagnostic pilot", () => {
  it("contains six fixtures per declared segment with unique authored hashes", () => {
    const fixtures = createOcrDiagnosticPilot();
    expect(fixtures).toHaveLength(24);
    for (const segment of ["clean", "challenging", "mixed", "controls"])
      expect(
        fixtures.filter((fixture) => fixture.segment === segment),
      ).toHaveLength(6);
    expect(
      new Set(fixtures.map((fixture) => fixture.manifest.sourceSha256)).size,
    ).toBe(24);
    // Source-only lock, never learned from extraction or engine output.
    expect(fixtures.map((fixture) => fixture.manifest.sourceSha256))
      .toMatchInlineSnapshot(`
        [
          "cc0ed2b06da96a77a86ac86ac2439681cac4063a38d33cad99e0e241efb2a3e5",
          "357405b5928f561385c1861de3bc6fd6063cd758e63462da75b476863e51d41e",
          "b40295a0e0f34e417d5837c679f92b30765dd4c93c77d812f6e4d1dee633456b",
          "1b6a5ec952efd46e6d55e35a3186733611f2079a11c3f5f27f774d616cf04130",
          "c228a50e065bf60304ec4b9230af497a48cc19aa0c68cc782630079c60c9ea0a",
          "5d1c5e442946e55adaee410821f327b1375f9af95518e1b0c1534d4a03b77e52",
          "eba6ac5ad8f79911a1acf6186bdd62870ceb15ec0d92e3b02d34088c47fe56ea",
          "373451429851cfb2c543a333153295fe78e6b1ff2ded8ee38cc56cdb469afadc",
          "00804dff00a70451cdd65de608a73dc1ec602104df9ddd0a9fa41f2390f91800",
          "f83f2f2f1be1891653d9fcb4d278ea9efe610f83d25da05c5b33452bc1b7f708",
          "755e104522d5aa931dd6c25c4f7b485f9a3fecd949fb8136b1cf6f40331229a3",
          "32fdd236fdcff94f0bccbd41d3bb7d10a98ad47337606a1872178dcfca24d97a",
          "085caf620cbf6c11ad459ef9263ee928dfe7674218513d82b120a6393fab18ad",
          "8cf6e520daac61a0f66af6a5ac8c85fc2bba86cfa4a6ad348bbcd558db2635cd",
          "594dfb1dd2bfe02f476bd744257bde053de8edacd6c6a9ee42309450ab1afc0f",
          "6273c5090efd0367bcecff2477e605fba25e0edd4c687330f02d4709bee9b5f1",
          "27448d346bbe3a000f753c9349a5f76d38c0dba0bfeb15d68c2fd1b00ccf37ad",
          "52ae092437b2309f8c3e9aefe65c99957f5fdcc1074a97faf5497e154b3cacef",
          "b53d01e0c02ada414c84f4d6fa5ed5ab887da1beb155a937704014c02267d91d",
          "deb63af5c5fd9b781429415c986d0a43fc8338102170b1b11083dd824fcdbc8f",
          "6d7779c25296d64076298bfd35a7e0ed2c0681c6d187305a5908c6a0ead77c24",
          "8a00982bd109cde83a4543a12bd750d816146a05845fd012f3c5ed9a4e371305",
          "4ff46b8d7dd152c5e22a6ffce0fff1b498cb627cc41acbb69ee9625419302dfe",
          "9aa27f612385e353abe59349e4d7f37ed5dc3de4861fefece9591a307e5f7891",
        ]
      `);
    for (const fixture of fixtures) {
      expect(fixture.manifest.sourceSha256).toBe(
        createHash("sha256").update(fixture.bytes).digest("hex"),
      );
      expect(fixture.manifest).toMatchObject({
        partition: "development",
        sourceFamily: "authored-block-glyph-v1",
        representativeValidity: "not_evaluated",
        independentFamilyProtocol: "not_satisfied",
      });
      for (const label of fixture.labels) {
        expect(
          fixture.expectedPageTexts![label.pageNumber - 1].slice(
            label.start,
            label.end,
          ),
        ).toBe(label.value);
      }
    }
  });
  it("encodes challenging transforms rather than merely naming them", () => {
    const fixtures = createOcrDiagnosticPilot().filter(
      (fixture) => fixture.segment === "challenging",
    );
    expect(fixtures.map((fixture) => fixture.transform)).toEqual([
      "skew_positive",
      "skew_negative",
      "rotate_90",
      "rotate_180",
      "downsample_2",
      "downsample_4",
    ]);
    expect(new TextDecoder().decode(fixtures[0].bytes)).toContain("39.36");
    expect(new TextDecoder().decode(fixtures[2].bytes)).toMatch(
      /0 [\d.]+ -[\d.]+ 0/,
    );
    expect(new TextDecoder().decode(fixtures[4].bytes)).toContain(
      "/Width 328 /Height 112",
    );
  });
  it("retains every native middle page and has no text layer in scanned variants", async () => {
    for (const fixture of createOcrDiagnosticPilot().filter((fixture) =>
      ["clean", "challenging", "mixed"].includes(fixture.segment),
    )) {
      const extracted = await extractPdfTextLayers(fixture.bytes, {
        maxPages: 3,
        maxCharacters: 10000,
      });
      expect(extracted.pageTexts).toEqual(
        fixture.segment === "mixed"
          ? ["", fixture.expectedPageTexts![1], ""]
          : [""],
      );
    }
  });
  it("distinguishes actual adverse inputs from provider-contract injections", () => {
    const fixtures = createOcrDiagnosticPilot().filter(
      (fixture) => fixture.segment === "controls",
    );
    expect(fixtures.map((fixture) => fixture.transform)).toEqual([
      "native_control",
      "blank_control",
      "corrupt_input",
      "oversized_input",
      "duplicate_provider_output",
      "missing_provider_output",
    ]);
    expect(fixtures[3].bytes.length).toBeGreaterThan(10 * 1024 * 1024);
    expect(fixtures[4].executionEvidence).toBe("contract_injection_only");
    expect(fixtures[4].providerPageInjection).toEqual([1, 1, 3]);
    expect(fixtures[5].providerPageInjection).toEqual([1]);
    expect(fixtures[2].expectedPageTexts).toBeNull();
  });
  it("encodes a genuinely blank page independently of its expected outcome", async () => {
    const blank = createOcrDiagnosticPilot().find(
      (fixture) => fixture.transform === "blank_control",
    )!;
    const extracted = await extractPdfTextLayers(blank.bytes, {
      maxPages: 3,
      maxCharacters: 10000,
    });
    expect(extracted.pageTexts).toEqual([""]);
    expect(blank.expectedPageTexts).toEqual([""]);
    expect(blank.labels).toEqual([]);
  });
});
