import { supabase } from "@/supabase/client";

/**
 * Simple helper to verify the anonymous Supabase client can read.
 */
export async function testSupabaseConnection() {
  return supabase.from("test").select("*");
}
