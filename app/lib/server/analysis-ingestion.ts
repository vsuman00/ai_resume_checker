import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createDatabaseTransactionBoundary } from "./database";
import { createResumeStorage } from "./storage";
import { createSupabaseAdminClient } from "./supabase";

const QueuedAnalysisSchema = z.object({
  analysisId: z.string().uuid(),
  resumeId: z.string().uuid(),
  created: z.boolean(),
});

export async function createQueuedAnalysis(args: {
  userId: string;
  fileName: string;
  pdf: Uint8Array;
  jobTitle: string;
  jobDescription: string;
  idempotencyKey: string;
  requestId: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: membership, error } = await admin
    .from("memberships")
    .select("organization_id")
    .eq("user_id", args.userId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !membership)
    throw new Error("Personal organization is unavailable.");

  const resumeId = randomUUID();
  const versionId = randomUUID();
  const analysisId = randomUUID();
  const jobId = randomUUID();
  const storage = createResumeStorage();
  const uploaded = await storage.upload({
    organizationId: membership.organization_id,
    resumeId,
    versionId,
    bytes: args.pdf,
  });

  try {
    const persisted = await createDatabaseTransactionBoundary().run(
      "create_queued_analysis",
      {
        p_analysis_id: analysisId,
        p_bytes: uploaded.bytes,
        p_checksum: uploaded.checksum,
        p_display_name: args.fileName,
        p_idempotency_key: args.idempotencyKey,
        p_job_description: args.jobDescription,
        p_job_id: jobId,
        p_job_title: args.jobTitle,
        p_organization_id: membership.organization_id,
        p_request_id: args.requestId,
        p_resume_id: resumeId,
        p_storage_key: uploaded.storageKey,
        p_user_id: args.userId,
        p_version_id: versionId,
      },
      QueuedAnalysisSchema,
    );
    if (!persisted.created) await storage.remove(uploaded.storageKey);
    return persisted;
  } catch (caught) {
    await storage.remove(uploaded.storageKey).catch(() => undefined);
    throw caught;
  }
}
