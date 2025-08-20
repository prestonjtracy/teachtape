import { createClient } from "@supabase/supabase-js";

/**
 * Server-side/admin Supabase client.
 * Uses the SERVICE_ROLE key — never import this file in browser code.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey);
}

/** Back-compat: some code may import { createClient } from '@/supabase/server' */
export { createServerClient as createClient };