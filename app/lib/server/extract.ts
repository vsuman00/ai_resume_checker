// PDF text extraction (all pages) via unpdf. Isolated from analyze.ts so it
// can be imported by self-checks under raw Node (no extensionless imports,
// no OpenAI/prompt deps). analyze.ts re-exports it.
import { getDocumentProxy, extractText } from "unpdf";

// pdfjs rejects Node Buffers ("Please provide binary data as Uint8Array"),
// and Buffer is an instanceof Uint8Array, so we can't shortcut on that.
// Always copy into a plain Uint8Array — cheap and bulletproof.
function toUint8Array(pdf: Buffer | Uint8Array): Uint8Array {
  const view = pdf as Uint8Array;
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
}

export async function extractResumeText(pdf: Buffer | Uint8Array): Promise<{ totalPages: number; text: string }> {
  const bytes = toUint8Array(pdf);
  const doc = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(doc, { mergePages: true });
  return { totalPages, text: Array.isArray(text) ? text.join("\n\n") : text };
}