import { anonClient } from "@/supabase/client";

export async function testSupabaseConnection() {
  return anonClient.from("test").select("*");
}
