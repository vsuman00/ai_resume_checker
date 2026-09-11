import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import { safeReturnTo } from "~/lib/server/auth";
import { createSupabaseServerClient } from "~/lib/server/supabase";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const responseHeaders = new Headers();

  if (!code) {
    return redirect("/auth?error=invalid_link", { headers: responseHeaders });
  }

  const client = createSupabaseServerClient(request, responseHeaders);
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return redirect("/auth?error=invalid_link", { headers: responseHeaders });
  }

  return redirect(safeReturnTo(url.searchParams.get("next")), {
    headers: responseHeaders,
  });
}
