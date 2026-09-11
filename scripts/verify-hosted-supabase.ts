import { createSupabaseAdminClient } from "../app/lib/server/supabase";

const { error } = await createSupabaseAdminClient()
  .from("analyses")
  .select("id", { head: true, count: "exact" })
  .limit(1);

if (error) {
  console.log(JSON.stringify({ status: "failed", code: error.code ?? null }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "ok", database: "reachable" }));
}
