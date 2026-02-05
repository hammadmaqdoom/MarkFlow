import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Hash an API key for storage or lookup (SHA-256 hex).
 */
export function hashApiKey(plainKey: string): string {
  return createHash("sha256").update(plainKey, "utf8").digest("hex");
}

/**
 * Resolve user_id from a Bearer API key using the service client (bypasses RLS).
 * Returns null if the key is invalid or not found.
 */
export async function getUserIdFromApiKey(plainKey: string): Promise<string | null> {
  const keyHash = hashApiKey(plainKey);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { user_id: string }).user_id;
}
