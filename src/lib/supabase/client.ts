import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

/**
 * Client-side utility to get the current user
 * Note: This will trigger a network request if session is not cached
 */
export async function getUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Client-side utility to get the current session
 */
export async function getSession() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Listen to auth state changes
 * Returns an unsubscribe function
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = createClient();
  return supabase.auth.onAuthStateChange(callback);
}
