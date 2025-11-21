import { createServerClient } from "@/supabase/server";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

const UuidSchema = z.string().uuid("Invalid UUID format");

export interface Coach {
  id: string;
  coach_id?: string; // New field for the actual coaches table ID
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
  sport: string | null;
}

export interface Listing {
  id: string;
  title: string | null;
  price_cents: number;
  duration_minutes: number;
  description: string | null;
  listing_type?: 'live_lesson' | 'film_review';
  turnaround_hours?: number | null;
}

export interface CoachWithListings extends Coach {
  listings: Listing[];
}

export interface DbResult<T> {
  success: true;
  data: T;
} 

export interface DbError {
  success: false;
  error: string;
  details?: unknown;
}

export type CoachResult<T> = DbResult<T> | DbError;

export async function getCoachById(id: string): Promise<CoachResult<CoachWithListings>> {
  console.log(`🔍 [getCoachById] Starting fetch for coach ID: ${id}`);
  
  try {
    // Validate UUID format
    const validId = UuidSchema.parse(id);
    console.log(`✅ [getCoachById] UUID validation passed for: ${validId}`);
    
    // Use service role to bypass RLS and ensure fresh data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // First try to fetch from new coach/services structure
    const { data: coachData, error: coachError } = await supabase
      .from("coaches")
      .select(`
        id,
        profile_id,
        sport,
        is_public,
        profile:profiles!coaches_profile_id_fkey (
          id,
          name,
          full_name,
          avatar_url,
          bio,
          role
        ),
        services (
          id,
          title,
          description,
          duration_minutes,
          price_cents,
          active
        )
      `)
      .eq("profile_id", validId)
      .eq("is_public", true)
      .single();

    if (!coachError && coachData && coachData.services.length > 0) {
      // New structure found with services
      const profileDataLog = (coachData.profile as any)?.[0];
      console.log(`✅ [getCoachById] Found coach in new structure:`, {
        id: coachData.id,
        name: profileDataLog?.name || profileDataLog?.full_name,
        servicesCount: coachData.services.length
      });

      const profileData = (coachData.profile as any)?.[0];
      const result: CoachWithListings = {
        id: coachData.profile_id,
        coach_id: coachData.id, // Include the actual coaches table ID
        full_name: profileData?.name || profileData?.full_name,
        role: profileData?.role,
        avatar_url: profileData?.avatar_url,
        bio: profileData?.bio,
        sport: coachData.sport,
        listings: coachData.services.map(service => ({
          id: service.id,
          title: service.title,
          price_cents: service.price_cents,
          duration_minutes: service.duration_minutes,
          description: service.description
        }))
      };

      return {
        success: true,
        data: result
      };
    }
    
    // Fall back to old structure for backward compatibility
    console.log(`📡 [getCoachById] Falling back to old structure...`);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url, bio, sport")
      .eq("id", validId)
      .eq("role", "coach") // Only coaches
      .single();


    if (profileError) {
      console.error(`❌ [getCoachById] Profile fetch error:`, {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      });
      
      if (profileError.code === 'PGRST116') {
        return {
          success: false,
          error: `Coach not found with ID: ${id}`,
          details: profileError
        };
      }
      
      return {
        success: false,
        error: `Database error fetching coach: ${profileError.message}`,
        details: profileError
      };
    }

    if (!profile) {
      console.warn(`⚠️ [getCoachById] No coach found with ID: ${id}`);
      return {
        success: false,
        error: `Coach not found with ID: ${id}`
      };
    }

    // Fetch legacy listings
    console.log(`🔍 [getCoachById] Fetching listings for coach_id: ${validId}`);
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id, title, price_cents, duration_minutes, description, is_active, listing_type, turnaround_hours")
      .eq("coach_id", validId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    console.log(`📊 [getCoachById] Listings query result:`, {
      count: listings?.length || 0,
      listings: listings,
      error: listingsError
    });

    // Debug: Log each listing's fields
    if (listings && listings.length > 0) {
      console.log(`🔍 [getCoachById] First listing details:`, {
        title: listings[0].title,
        price_cents: listings[0].price_cents,
        listing_type: listings[0].listing_type,
        turnaround_hours: listings[0].turnaround_hours,
        description: listings[0].description
      });
    }

    if (listingsError) {
      console.error(`❌ [getCoachById] Listings fetch error:`, {
        message: listingsError.message,
        code: listingsError.code,
        details: listingsError.details
      });

      return {
        success: false,
        error: `Error fetching coach listings: ${listingsError.message}`,
        details: listingsError
      };
    }

    const result: CoachWithListings = {
      ...profile,
      listings: listings || []
    };

    console.log(`✅ [getCoachById] Successfully fetched coach with ${result.listings.length} listings (legacy)`);
    
    return {
      success: true,
      data: result
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [getCoachById] Invalid UUID format:`, error.errors);
      return {
        success: false,
        error: `Invalid coach ID format: ${id}`,
        details: error.errors
      };
    }

    console.error(`❌ [getCoachById] Unexpected error:`, error);
    return {
      success: false,
      error: `Unexpected error fetching coach data`,
      details: error
    };
  }
}