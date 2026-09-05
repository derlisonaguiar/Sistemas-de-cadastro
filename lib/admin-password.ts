import { createClient } from "@supabase/supabase-js";

export async function verifyAdminPassword(user: { id: string; email?: string }, password: string) {
  if (!user.email) return false;
  try {
    // Isolated client: never replace the administrator's session or persist credentials.
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    const { data, error } = await client.auth.signInWithPassword({ email: user.email, password });
    return !error && data.user?.id === user.id;
  } catch {
    return false;
  }
}
