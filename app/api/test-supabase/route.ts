import supabase from "@/supabase/client";

export async function GET() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
