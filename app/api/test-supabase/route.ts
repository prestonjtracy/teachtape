import supabase from "@/supabase/client";

/**
 * Simple route that returns all rows from the `profiles` table.
 */
export async function GET() {
  const { data, error } = await supabase.from("profiles").select("*");

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

