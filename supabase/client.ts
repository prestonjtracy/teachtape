import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public/anon client for pages, server components, and browser-safe calls
export const anonClient = createClient(url, anon);

// Admin/service-role client for server-only code (tasks, webhooks, secure routes)
export const adminClient = createClient(url, service, { auth: { persistSession: false } });

// Backwards-compat convenience (if any file imported "supabase")
export { anonClient as supabase };
