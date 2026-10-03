import { NativeLayoutSchema } from "../native-layout-schema";
import { createSupabaseAdminClient } from "./supabase";

export async function readOwnedNativeLayout(
  analysisId: string,
  userId: string,
) {
  const { data, error } = await createSupabaseAdminClient()
    .from("analysis_extractions")
    .select("native_layout")
    .eq("analysis_id", analysisId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error("Layout evidence is unavailable.");
  const parsed = NativeLayoutSchema.safeParse(data?.native_layout);
  return parsed.success ? parsed.data : null;
}
