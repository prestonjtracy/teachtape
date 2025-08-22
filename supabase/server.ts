import { createClient } from '@supabase/supabase-js';

// Server-side/admin client. Do NOT use in the browser.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Back-compat so `import { createClient } from "@/supabase/server"` still works
export { createServerClient as createClient };
