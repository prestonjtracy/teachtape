/**
 * Complete seeding script for TeachTape booking flow
 * Creates: 1 public coach, 2 services, and ~8 availability slots over next 7 days
 */
import { randomUUID } from "crypto";
import { createClient } from "@/supabase/server";

interface SeedData {
  profile: {
    id: string;
    name: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    role: string;
  };
  coach: {
    id: string;
    profile_id: string;
    sport: string;
    is_public: boolean;
  };
  services: Array<{
    id: string;
    coach_id: string;
    title: string;
    description: string;
    duration_minutes: number;
    price_cents: number;
    currency: string;
    active: boolean;
  }>;
  availabilities: Array<{
    id: string;
    coach_id: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
  }>;
}

async function seed() {
  const supabase = createClient();
  
  console.log("🚀 Starting complete TeachTape seeding...");

  try {
    // Generate IDs
    const profileId = randomUUID();
    const coachId = randomUUID();
    const service1Id = randomUUID();
    const service2Id = randomUUID();

    const seedData: SeedData = {
      profile: {
        id: profileId,
        name: "Sarah Johnson",
        full_name: "Sarah Johnson",
        avatar_url: "https://i.pravatar.cc/150?img=32",
        bio: "Professional tennis coach with 10+ years of experience. Former college player and certified USPTA instructor.",
        role: "coach"
      },
      coach: {
        id: coachId,
        profile_id: profileId,
        sport: "Tennis",
        is_public: true
      },
      services: [
        {
          id: service1Id,
          coach_id: coachId,
          title: "1-on-1 Tennis Fundamentals",
          description: "Perfect for beginners and intermediate players. Focus on basic techniques, footwork, and stroke development.",
          duration_minutes: 60,
          price_cents: 8000, // $80.00
          currency: "usd",
          active: true
        },
        {
          id: service2Id,
          coach_id: coachId,
          title: "Advanced Strategy & Match Play",
          description: "For competitive players looking to improve their game strategy, mental toughness, and match play skills.",
          duration_minutes: 90,
          price_cents: 12000, // $120.00
          currency: "usd",
          active: true
        }
      ],
      availabilities: []
    };

    // Generate ~8 availability slots over next 7 days
    const now = new Date();
    const slotsData = [
      { dayOffset: 1, hour: 10, duration: 60 }, // Tomorrow 10 AM, 60 min
      { dayOffset: 1, hour: 14, duration: 90 }, // Tomorrow 2 PM, 90 min
      { dayOffset: 2, hour: 9, duration: 60 },  // Day after tomorrow 9 AM, 60 min
      { dayOffset: 2, hour: 15, duration: 90 }, // Day after tomorrow 3 PM, 90 min
      { dayOffset: 3, hour: 11, duration: 60 }, // Day 3: 11 AM, 60 min
      { dayOffset: 4, hour: 10, duration: 90 }, // Day 4: 10 AM, 90 min  
      { dayOffset: 5, hour: 14, duration: 60 }, // Day 5: 2 PM, 60 min
      { dayOffset: 6, hour: 16, duration: 90 }  // Day 6: 4 PM, 90 min
    ];

    slotsData.forEach(slot => {
      const slotStart = new Date(now);
      slotStart.setDate(slotStart.getDate() + slot.dayOffset);
      slotStart.setHours(slot.hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slot.duration);
      
      seedData.availabilities.push({
        id: randomUUID(),
        coach_id: coachId,
        starts_at: slotStart.toISOString(),
        ends_at: slotEnd.toISOString(),
        capacity: 1
      });
    });

    console.log(`📊 Prepared seed data:`, {
      profile: seedData.profile.name,
      coach: seedData.coach.sport,
      services: seedData.services.length,
      availabilities: seedData.availabilities.length
    });

    // Insert profile
    console.log("👤 Creating profile...");
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", seedData.profile.full_name)
      .single();

    if (existingProfile) {
      console.log("✅ Profile already exists:", seedData.profile.full_name);
      seedData.profile.id = existingProfile.id;
      seedData.coach.profile_id = existingProfile.id;
      
      // Update services and availabilities to use existing coach
      const { data: existingCoach } = await supabase
        .from("coaches")
        .select("id")
        .eq("profile_id", existingProfile.id)
        .single();
      
      if (existingCoach) {
        seedData.coach.id = existingCoach.id;
        seedData.services.forEach(service => service.coach_id = existingCoach.id);
        seedData.availabilities.forEach(avail => avail.coach_id = existingCoach.id);
      }
    } else {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: seedData.profile.id,
          auth_user_id: randomUUID(), // For testing
          full_name: seedData.profile.full_name,
          avatar_url: seedData.profile.avatar_url,
          bio: seedData.profile.bio,
          role: seedData.profile.role,
          sport: "Tennis" // Add sport to profile
        });

      if (profileError) {
        console.error("❌ Error creating profile:", profileError);
        throw profileError;
      }
      console.log("✅ Profile created:", seedData.profile.name);
    }

    // Insert coach
    console.log("🏃 Creating coach...");
    const { data: existingCoach } = await supabase
      .from("coaches")
      .select("id")
      .eq("profile_id", seedData.profile.id)
      .single();

    if (!existingCoach) {
      const { error: coachError } = await supabase
        .from("coaches")
        .insert(seedData.coach);

      if (coachError) {
        console.error("❌ Error creating coach:", coachError);
        throw coachError;
      }
      console.log("✅ Coach created:", seedData.coach.sport);
    } else {
      console.log("✅ Coach already exists");
      seedData.coach.id = existingCoach.id;
      seedData.services.forEach(service => service.coach_id = existingCoach.id);
      seedData.availabilities.forEach(avail => avail.coach_id = existingCoach.id);
    }

    // Insert services
    console.log("⚽ Creating services...");
    for (const service of seedData.services) {
      const { data: existingService } = await supabase
        .from("services")
        .select("id")
        .eq("coach_id", service.coach_id)
        .eq("title", service.title)
        .single();

      if (!existingService) {
        const { error: serviceError } = await supabase
          .from("services")
          .insert(service);

        if (serviceError) {
          console.error("❌ Error creating service:", serviceError);
          throw serviceError;
        }
        console.log("✅ Service created:", service.title);
      } else {
        console.log("✅ Service already exists:", service.title);
      }
    }

    // Clear existing availabilities for this coach
    console.log("🗓️ Clearing old availabilities...");
    await supabase
      .from("availabilities")
      .delete()
      .eq("coach_id", seedData.coach.id);

    // Insert new availabilities
    console.log("📅 Creating availabilities...");
    const { error: availError } = await supabase
      .from("availabilities")
      .insert(seedData.availabilities);

    if (availError) {
      console.error("❌ Error creating availabilities:", availError);
      throw availError;
    }
    console.log(`✅ Created ${seedData.availabilities.length} availability slots`);

    console.log("🎉 Seeding completed successfully!");
    console.log("");
    console.log("🔗 Test the booking flow:");
    console.log(`   👤 Coach: ${seedData.profile.name}`);
    console.log(`   🌐 URL: http://localhost:3000/coaches/${seedData.profile.id}`);
    console.log(`   📧 Name: ${seedData.profile.full_name}`);
    console.log("");
    console.log("💡 Available services:");
    seedData.services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - $${(service.price_cents / 100).toFixed(2)} (${service.duration_minutes}m)`);
    });
    console.log("");
    console.log("🕒 Availability slots:");
    console.log(`   📊 ${seedData.availabilities.length} slots over next 7 days`);
    seedData.availabilities.slice(0, 3).forEach((slot, i) => {
      const date = new Date(slot.starts_at);
      const duration = (new Date(slot.ends_at).getTime() - date.getTime()) / (1000 * 60);
      console.log(`   ${i + 1}. ${date.toLocaleDateString()} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} (${duration}m)`);
    });
    if (seedData.availabilities.length > 3) {
      console.log(`   ... and ${seedData.availabilities.length - 3} more`);
    }

    return {
      profileId: seedData.profile.id,
      coachId: seedData.coach.id,
      url: `http://localhost:3000/coaches/${seedData.profile.id}`
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