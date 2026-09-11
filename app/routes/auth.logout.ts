import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { createSupabaseServerClient } from "~/lib/server/supabase";
import { assertSameOrigin } from "~/lib/server/security";
import { getServerConfig } from "~/lib/server/config";

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request, getServerConfig().APP_ORIGIN);
  const responseHeaders = new Headers();
  const client = createSupabaseServerClient(request, responseHeaders);
  await client.auth.signOut();
  return redirect("/", { headers: responseHeaders });
}
