import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let serviceClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Supabase client with service role key (bypasses RLS). Use only in server-side API routes.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceClient) {
    serviceClient = createSupabaseClient(url, key);
  }
  return serviceClient;
}
