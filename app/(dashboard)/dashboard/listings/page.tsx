import { createClient } from "@/supabase/server";

export default async function ListingsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, title, price_cents, duration_minutes");

  if (error) {
    console.error("Error loading listings:", error);
    return <main>Failed to load listings.</main>;
  }

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
