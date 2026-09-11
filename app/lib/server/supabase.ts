import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getServerConfig } from "./config";

export function getSessionCookieOptions(
  appOrigin: string,
  maxAgeSeconds = 3_600,
) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: appOrigin.startsWith("https://"),
    maxAge: maxAgeSeconds,
  };
}

export function createSupabaseServerClient(
  request: Request,
  responseHeaders: Headers,
) {
  const config = getServerConfig();

  return createServerClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => parseCookieHeader(request.headers.get("Cookie") ?? ""),
        setAll: (cookiesToSet, cacheHeaders) => {
          for (const { name, value, options } of cookiesToSet) {
            responseHeaders.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options),
            );
          }
          for (const [name, value] of Object.entries(cacheHeaders)) {
            responseHeaders.set(name, value);
          }
        },
      },
      cookieOptions: getSessionCookieOptions(
        config.APP_ORIGIN,
        config.SESSION_MAX_AGE_SECONDS,
      ),
    },
  );
}

export function createSupabaseAdminClient() {
  const config = getServerConfig();

  return createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
