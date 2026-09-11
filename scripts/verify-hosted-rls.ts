import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getServerConfig } from "../app/lib/server/config";
import { createSupabaseAdminClient } from "../app/lib/server/supabase";

function password() {
  return `${randomBytes(24).toString("base64url")}Aa1!`;
}

async function waitForOrganization(userId: string) {
  const admin = createSupabaseAdminClient();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await admin
      .from("organizations")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("SYNTHETIC_ORGANIZATION_UNAVAILABLE");
}

async function main() {
  const admin = createSupabaseAdminClient();
  const config = getServerConfig();
  const runId = randomUUID();
  const firstPassword = password();
  const secondPassword = password();
  let firstUserId: string | undefined;
  let secondUserId: string | undefined;
  let stage = "create_users";

  try {
    const first = await admin.auth.admin.createUser({
      email: `phase7-a-${runId}@example.test`,
      password: firstPassword,
      email_confirm: true,
    });
    if (first.error || !first.data.user)
      throw new Error("CREATE_USER_A_FAILED");
    firstUserId = first.data.user.id;

    const second = await admin.auth.admin.createUser({
      email: `phase7-b-${runId}@example.test`,
      password: secondPassword,
      email_confirm: true,
    });
    if (second.error || !second.data.user)
      throw new Error("CREATE_USER_B_FAILED");
    secondUserId = second.data.user.id;

    const firstOrganizationId = await waitForOrganization(firstUserId);
    await waitForOrganization(secondUserId);

    stage = "create_private_record";
    const { error: requestError } = await admin.from("data_requests").insert({
      organization_id: firstOrganizationId,
      user_id: firstUserId,
      kind: "export",
    });
    if (requestError) throw new Error("CREATE_PRIVATE_RECORD_FAILED");

    const firstClient = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const secondClient = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    stage = "authenticate_users";
    const firstSignIn = await firstClient.auth.signInWithPassword({
      email: `phase7-a-${runId}@example.test`,
      password: firstPassword,
    });
    const secondSignIn = await secondClient.auth.signInWithPassword({
      email: `phase7-b-${runId}@example.test`,
      password: secondPassword,
    });
    if (firstSignIn.error || secondSignIn.error)
      throw new Error("SYNTHETIC_SIGN_IN_FAILED");

    stage = "verify_owner_access";
    const ownerOrganization = await firstClient
      .from("organizations")
      .select("id")
      .eq("id", firstOrganizationId)
      .maybeSingle();
    const ownerRequest = await firstClient
      .from("data_requests")
      .select("id")
      .eq("user_id", firstUserId);
    if (
      ownerOrganization.error ||
      !ownerOrganization.data ||
      ownerRequest.error ||
      ownerRequest.data.length !== 1
    ) {
      throw new Error("OWNER_ACCESS_FAILED");
    }

    stage = "verify_cross_tenant_denial";
    const foreignOrganization = await secondClient
      .from("organizations")
      .select("id")
      .eq("id", firstOrganizationId);
    const foreignRequest = await secondClient
      .from("data_requests")
      .select("id")
      .eq("user_id", firstUserId);
    if (
      foreignOrganization.error ||
      foreignOrganization.data.length !== 0 ||
      foreignRequest.error ||
      foreignRequest.data.length !== 0
    ) {
      throw new Error("CROSS_TENANT_DENIAL_FAILED");
    }

    stage = "verify_worker_boundary";
    const workerRpc = await secondClient.rpc("persist_partial_analysis", {
      p_analysis_id: randomUUID(),
      p_feedback: {},
      p_process_id: "phase7-rls-test",
      p_request_id: "phase7-rls-test",
    });
    if (!workerRpc.error) throw new Error("WORKER_RPC_WAS_PUBLIC");

    console.log(
      JSON.stringify({
        status: "ok",
        ownerAccess: true,
        crossTenantDenied: true,
        workerRpcDenied: true,
      }),
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNEXPECTED";
    console.error(JSON.stringify({ status: "failed", stage, code }));
    process.exitCode = 1;
  } finally {
    if (firstUserId) await admin.auth.admin.deleteUser(firstUserId);
    if (secondUserId) await admin.auth.admin.deleteUser(secondUserId);
  }
}

await main();
