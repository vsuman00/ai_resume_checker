import { randomUUID } from "node:crypto";
import { JOB_LEASE_SECONDS, retryDelaySeconds } from "./job-policy";
import { createSupabaseAdminClient } from "./supabase";

export class AnalysisJobQueue {
  private readonly workerId = `worker-${randomUUID()}`;

  async claim(): Promise<{
    analysisId: string;
    attempt: number;
    runAfter?: string;
  } | null> {
    const { data, error } = await createSupabaseAdminClient().rpc(
      "claim_analysis_job",
      { p_worker_id: this.workerId, p_lease_seconds: JOB_LEASE_SECONDS },
    );
    if (error) throw new Error("Analysis job claim failed.");
    if (!data) return null;
    if (
      typeof data !== "object" ||
      !("analysisId" in data) ||
      !("attempt" in data)
    ) {
      throw new Error("Analysis job claim returned an invalid result.");
    }
    const result: {
      analysisId: string;
      attempt: number;
      runAfter?: string;
    } = {
      analysisId: String(data.analysisId),
      attempt: Number(data.attempt),
    };
    if ("runAfter" in data && typeof data.runAfter === "string") {
      result.runAfter = data.runAfter;
    }
    return result;
  }

  async complete(analysisId: string): Promise<boolean> {
    const { data, error } = await createSupabaseAdminClient().rpc(
      "complete_analysis_job",
      { p_analysis_id: analysisId, p_worker_id: this.workerId },
    );
    if (error) throw new Error("Analysis job completion failed.");
    return data === true;
  }

  async heartbeat(analysisId: string): Promise<boolean> {
    const { data, error } = await createSupabaseAdminClient().rpc(
      "heartbeat_analysis_job",
      {
        p_analysis_id: analysisId,
        p_worker_id: this.workerId,
        p_lease_seconds: JOB_LEASE_SECONDS,
      },
    );
    if (error) throw new Error("Analysis job heartbeat failed.");
    return data === true;
  }

  async release(args: {
    analysisId: string;
    attempt: number;
    errorCode: string;
  }): Promise<boolean> {
    const { data, error } = await createSupabaseAdminClient().rpc(
      "release_analysis_job",
      {
        p_analysis_id: args.analysisId,
        p_worker_id: this.workerId,
        p_retry_delay_seconds: retryDelaySeconds(args.attempt),
        p_error_code: args.errorCode,
      },
    );
    if (error) throw new Error("Analysis job release failed.");
    return data === true;
  }
}
