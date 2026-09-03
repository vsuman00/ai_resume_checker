import { analyzeResume } from "~/lib/server/analyze";

// React Router resource route. POST FormData:
//   file: PDF
//   jobTitle: string
//   jobDescription: string
// Returns: { feedback: Feedback }
export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const jobTitle = (form.get("jobTitle") as string | null) ?? "";
  const jobDescription = (form.get("jobDescription") as string | null) ?? "";

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'file' in form data" }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "Uploaded file is empty" }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf") {
    return Response.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await analyzeResume({ pdf: buffer, jobTitle, jobDescription });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
