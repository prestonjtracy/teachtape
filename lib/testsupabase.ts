import { supabase } from "@/supabase/client";

export async function testSupabaseConnection() {
  return supabase.from("test").select("*");
}
