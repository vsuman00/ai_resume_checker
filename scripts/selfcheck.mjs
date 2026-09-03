// Ponytail self-check: verifies the server-side PDF extraction path end-to-end.
// Run: node --experimental-strip-types scripts/selfcheck.mjs
// Requires no API key. Self-contained — only depends on unpdf, so it runs under
// raw Node type-stripping without the app's bundler path resolution.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getDocumentProxy, extractText } from "unpdf";

const here = dirname(fileURLToPath(import.meta.url));
const pdfPath = join(here, "dummy.pdf");

const buffer = await readFile(pdfPath);
const bytes = new Uint8Array(buffer);
const doc = await getDocumentProxy(bytes);
const { totalPages, text } = await extractText(doc, { mergePages: true });
const full = Array.isArray(text) ? text.join("\n\n") : text;

const preview = full.slice(0, 400).replace(/\s+/g, " ").trim();
console.log(`pages: ${totalPages}`);
console.log(`chars: ${full.length}`);
console.log(`preview: ${preview}`);

if (totalPages < 1) throw new Error("expected at least 1 page");
if (full.length < 1) throw new Error("expected non-empty extracted text");
console.log("ok");