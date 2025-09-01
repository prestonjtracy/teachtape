/**
 * Simple seeding script that works with existing schema
 * Creates test data using the current listings/profiles structure
 */
import { randomUUID } from "crypto";
import { createClient } from "@/supabase/server";

async function seed() {
  const supabase = createClient();
  
  console.log("🚀 Starting simple TeachTape seeding...");

  try {
    const profileId = randomUUID();
    
    // Create profile with existing schema
    console.log("👤 Creating coach profile...");
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", "Sarah Johnson")
      .single();

    let coachProfileId = profileId;
    
    if (existingProfile) {
      console.log("✅ Coach profile already exists:", existingProfile.id);
      coachProfileId = existingProfile.id;
    } else {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: profileId,
          auth_user_id: randomUUID(), // For testing
          full_name: "Sarah Johnson",
          role: "coach",
          avatar_url: "https://i.pravatar.cc/150?img=32",
          bio: "Professional tennis coach with 10+ years of experience. Former college player and certified USPTA instructor.",
          sport: "Tennis"
        });

      if (profileError) {
        console.error("❌ Error creating profile:", profileError);
        throw profileError;
      }
      console.log("✅ Coach profile created: Sarah Johnson");
    }

    // Create listings (services) using existing schema
    console.log("⚽ Creating listings...");
    const listings = [
      {
        id: randomUUID(),
        coach_id: coachProfileId,
        title: "1-on-1 Tennis Fundamentals",
        description: "Perfect for beginners and intermediate players. Focus on basic techniques, footwork, and stroke development.",
        price_cents: 8000, // $80.00
        duration_minutes: 60,
        is_active: true
      },
      {
        id: randomUUID(),
        coach_id: coachProfileId,
        title: "Advanced Strategy & Match Play",
        description: "For competitive players looking to improve their game strategy, mental toughness, and match play skills.",
        price_cents: 12000, // $120.00
        duration_minutes: 90,
        is_active: true
      }
    ];

    for (const listing of listings) {
      const { data: existingListing } = await supabase
        .from("listings")
        .select("id")
        .eq("coach_id", listing.coach_id)
        .eq("title", listing.title)
        .single();

      if (!existingListing) {
        const { error: listingError } = await supabase
          .from("listings")
          .insert(listing);

        if (listingError) {
          console.error("❌ Error creating listing:", listingError);
          throw listingError;
        }
        console.log("✅ Listing created:", listing.title);
      } else {
        console.log("✅ Listing already exists:", listing.title);
      }
    }

    console.log("🎉 Simple seeding completed successfully!");
    console.log("");
    console.log("🔗 Test the booking flow:");
    console.log(`   👤 Coach: Sarah Johnson`);
    console.log(`   🌐 URL: http://localhost:3000/coaches/${coachProfileId}`);
    console.log("");
    console.log("💡 Available services:");
    listings.forEach((listing, index) => {
      console.log(`   ${index + 1}. ${listing.title} - $${(listing.price_cents / 100).toFixed(2)} (${listing.duration_minutes}m)`);
    });
    console.log("");
    console.log("⚠️  Note: New schema features (services, availabilities, etc.) require");
    console.log("   running the database migrations in Supabase dashboard first.");

    return {
      profileId: coachProfileId,
      url: `http://localhost:3000/coaches/${coachProfileId}`
    };

  } catch (error) {
    console.error("💥 Seeding failed:", error);
    throw error;
  }
}

if (require.main === module) {
  seed()
    .then((result) => {
      console.log("\n🚀 Ready to test! Visit:", result.url);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export { seed };