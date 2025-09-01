/**
 * One-time script to insert demo coach profiles into Supabase.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment and must only be run on the server (never in the browser).
 */
import { randomUUID } from "crypto";
import { createClient } from "@/supabase/server"; // server/admin client (uses service role key)

const coaches = [
  { full_name: "Alex Carter",  avatar_url: "https://i.pravatar.cc/150?img=11" },
  { full_name: "Jamie Brooks", avatar_url: "https://i.pravatar.cc/150?img=32" },
  { full_name: "Taylor Reed",  avatar_url: "https://i.pravatar.cc/150?img=7"  },
];

async function seed() {
  const supabase = createClient(); // ✅ use server client (service role)

  for (const coach of coaches) {
    // See if a profile already exists for this name
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", coach.full_name)
      .maybeSingle();

    if (fetchError) {
      console.error(`Failed to check ${coach.full_name}:`, fetchError.message);
      continue;
    }

    // If already there, skip
    if (existing?.id) {
      console.log(`Exists: ${coach.full_name} (id: ${existing.id})`);
      continue;
    }

    // Otherwise create the coach profile
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: randomUUID(),
        auth_user_id: randomUUID(), // For testing, using a random UUID
        role: "coach",
        full_name: coach.full_name,
        avatar_url: coach.avatar_url,
        bio: `Experienced ${coach.full_name.split(' ')[0]} coach ready to help you improve your game.`,
        sport: "Tennis" // Default sport for testing
      })
      .select("id")
      .single();

    if (insertError) {
      console.error(`Insert failed for ${coach.full_name}:`, insertError.message);
      continue;
    }

    console.log(`Inserted: ${coach.full_name} (id: ${inserted.id})`);
  }

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed crashed:", err);
  process.exit(1);
});