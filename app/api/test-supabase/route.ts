import { supabase } from "@/supabase/client";

/**
 * Simple route that returns `id`, `full_name`, and `role` fields
 * from the `profiles` table using the anonymous Supabase client.
 */
export async function GET() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

