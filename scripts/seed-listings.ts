/**
 * One-time script to insert demo listings into Supabase.
 */
import { randomUUID } from "crypto";
import { createClient } from "@/supabase/server";

async function seed() {
  const supabase = createClient();

  // First get all coach profiles
  const { data: coaches, error: coachError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "coach");

  if (coachError) {
    console.error("Failed to fetch coaches:", coachError.message);
    return;
  }

  if (!coaches || coaches.length === 0) {
    console.log("No coaches found. Run seed:coaches first.");
    return;
  }

  const listings = [
    {
      title: "1-on-1 Tennis Coaching Session",
      description: "Improve your tennis technique with personalized coaching. Perfect for beginners and intermediate players.",
      price_cents: 7500, // $75.00
      duration_minutes: 60
    },
    {
      title: "Advanced Tennis Strategy Session", 
      description: "Advanced tactics and strategy for competitive players. Focus on match play and mental game.",
      price_cents: 10000, // $100.00
      duration_minutes: 90
    }
  ];

  for (const coach of coaches) {
    for (const listing of listings) {
      // Check if listing already exists for this coach
      const { data: existing } = await supabase
        .from("listings")
        .select("id")
        .eq("coach_id", coach.id)
        .eq("title", listing.title)
        .maybeSingle();

      if (existing?.id) {
        console.log(`Exists: ${listing.title} for ${coach.full_name}`);
        continue;
      }

      // Create the listing
      const { data: inserted, error: insertError } = await supabase
        .from("listings")
        .insert({
          id: randomUUID(),
          coach_id: coach.id,
          title: listing.title,
          description: listing.description,
          price_cents: listing.price_cents,
          duration_minutes: listing.duration_minutes,
          is_active: true
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Insert failed for ${listing.title} (${coach.full_name}):`, insertError.message);
        continue;
      }

      console.log(`Inserted: ${listing.title} for ${coach.full_name} (id: ${inserted.id})`);
    }
  }

  console.log("Listings seed complete.");
}

seed().catch((err) => {
  console.error("Listings seed crashed:", err);
  process.exit(1);
});