// ASCII-only synthetic PDFs; explicit xref offsets avoid real candidate data.
export const CONTACT_PDF_STREAM =
  "BT /F1 12 Tf 50 750 Td (Alex Example) Tj 0 -20 Td (alex@example.test) Tj 0 -20 Td (+1 202 555 0100) Tj ET";
export function syntheticPdf(
  stream: string | string[] = CONTACT_PDF_STREAM,
  rotation = 0,
  pageCount = 1,
) {
  if (Array.isArray(stream)) pageCount = stream.length;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (let index = 0; index < pageCount; index++) {
    const pageStream = Array.isArray(stream) ? stream[index] : stream;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Rotate ${rotation} /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
      `<< /Length ${pageStream.length} >>\nstream\n${pageStream}\nendstream`,
    );
  }
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
