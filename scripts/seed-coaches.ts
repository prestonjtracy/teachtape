/**
 * One-time script to insert demo coach profiles into Supabase.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment and must only be run on the server (never in the browser).
 */
import { randomUUID } from "crypto";
import { adminClient as supabase } from "../supabase/client";
const coaches = [
  { full_name: "Alex Carter", avatar_url: "https://i.pravatar.cc/150?img=11" },
  { full_name: "Jamie Brooks", avatar_url: "https://i.pravatar.cc/150?img=32" },
  { full_name: "Taylor Reed", avatar_url: "https://i.pravatar.cc/150?img=7" },
];

async function seed() {
  for (const coach of coaches) {
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", coach.full_name)
      .maybeSingle();

    if (fetchError) {
      console.error(`Failed to check ${coach.full_name}:`, fetchError.message);
      continue;
    }
    if (existing) {
      console.log(`Skipping ${coach.full_name} (already exists)`);
      continue;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      full_name: coach.full_name,
      role: "coach",
      avatar_url: coach.avatar_url,
      auth_user_id: randomUUID(),
    });

    if (insertError) {
      console.error(`Failed to insert ${coach.full_name}:`, insertError.message);
    } else {
      console.log(`Inserted ${coach.full_name}`);
    }
  }
}

seed()
  .then(() => {
    console.log("Seeding complete");
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
