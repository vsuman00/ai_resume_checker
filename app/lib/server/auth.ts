import type { User } from "@supabase/supabase-js";

export interface SessionReader {
  auth: {
    getUser: () => Promise<{ data: { user: User | null }; error: unknown }>;
  };
}

export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function getAuthenticatedUser(
  client: SessionReader,
): Promise<User | null> {
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
}
