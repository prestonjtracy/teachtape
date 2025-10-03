import { createServerClient } from "@/supabase/server";
import { z } from "zod";
import type { Service as ServiceType } from "@/types/db";

const UuidSchema = z.string().uuid("Invalid UUID format");
const EmailSchema = z.string().email("Invalid email format");

export interface Coach {
  id: string;
  profile_id: string;
  sport: string | null;
  is_public: boolean;
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
}

// Use Service type from types/db.ts, but allow partial data from Supabase queries
export type Service = Omit<ServiceType, 'created_at'> & {
  created_at?: string;
};

export interface Availability {
  id: string;
  coach_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
}

export interface CoachWithServices extends Coach {
  services: Omit<Service, 'coach_id'>[];
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

export type BookingResult<T> = DbResult<T> | DbError;

export async function getCoachWithServices(profileId: string): Promise<BookingResult<CoachWithServices>> {
  console.log(`🔍 [getCoachWithServices] Starting fetch for profile ID: ${profileId}`);
  
  try {
    const validId = UuidSchema.parse(profileId);
    console.log(`✅ [getCoachWithServices] UUID validation passed for: ${validId}`);
    
    const supabase = createServerClient();
    
    // Fetch coach with profile data and services
    console.log(`📡 [getCoachWithServices] Fetching coach and services...`);
    const { data: coach, error: coachError } = await supabase
      .from("coaches")
      .select(`
        id,
        profile_id,
        sport,
        is_public,
        profile:profiles!coaches_profile_id_fkey (
          id,
          name,
          email,
          avatar_url,
          bio
        ),
        services (
          id,
          title,
          description,
          duration_minutes,
          price_cents,
          currency,
          active
        )
      `)
      .eq("profile_id", validId)
      .eq("is_public", true)
      .single();

    if (coachError) {
      console.error(`❌ [getCoachWithServices] Coach fetch error:`, {
        message: coachError.message,
        code: coachError.code,
        details: coachError.details
      });
      
      if (coachError.code === 'PGRST116') {
        return {
          success: false,
          error: `Coach not found with profile ID: ${profileId}`,
          details: coachError
        };
      }
      
      return {
        success: false,
        error: `Database error fetching coach: ${coachError.message}`,
        details: coachError
      };
    }

    if (!coach) {
      console.warn(`⚠️ [getCoachWithServices] No public coach found with profile ID: ${profileId}`);
      return {
        success: false,
        error: `Coach not found with profile ID: ${profileId}`
      };
    }

    console.log(`✅ [getCoachWithServices] Coach found with ${coach.services.length} services`);

    // Normalize profile data (Supabase returns array for foreign key relations)
    const normalizedCoach: CoachWithServices = {
      ...coach,
      profile: Array.isArray(coach.profile) ? coach.profile[0] || null : coach.profile
    };

    return {
      success: true,
      data: normalizedCoach
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [getCoachWithServices] Invalid UUID format:`, error.errors);
      return {
        success: false,
        error: `Invalid profile ID format: ${profileId}`,
        details: error.errors
      };
    }

    console.error(`❌ [getCoachWithServices] Unexpected error:`, error);
    return {
      success: false,
      error: `Unexpected error fetching coach data`,
      details: error
    };
  }
}

export async function getAvailabilitiesForCoach(
  coachId: string,
  fromDate: Date,
  toDate: Date
): Promise<BookingResult<Availability[]>> {
  console.log(`🔍 [getAvailabilitiesForCoach] Fetching availabilities for coach: ${coachId}`);
  
  try {
    const validCoachId = UuidSchema.parse(coachId);
    const supabase = createServerClient();
    
    const { data: availabilities, error } = await supabase
      .from("availabilities")
      .select("*")
      .eq("coach_id", validCoachId)
      .gte("starts_at", fromDate.toISOString())
      .lte("starts_at", toDate.toISOString())
      .order("starts_at", { ascending: true });

    if (error) {
      console.error(`❌ [getAvailabilitiesForCoach] Error:`, error);
      return {
        success: false,
        error: `Error fetching availabilities: ${error.message}`,
        details: error
      };
    }

    console.log(`✅ [getAvailabilitiesForCoach] Found ${availabilities.length} slots`);
    
    return {
      success: true,
      data: availabilities
    };

  } catch (error) {
    console.error(`❌ [getAvailabilitiesForCoach] Unexpected error:`, error);
    return {
      success: false,
      error: "Unexpected error fetching availabilities",
      details: error
    };
  }
}

export async function getServiceById(serviceId: string): Promise<BookingResult<Service>> {
  console.log(`🔍 [getServiceById] Fetching service: ${serviceId}`);
  
  try {
    const validServiceId = UuidSchema.parse(serviceId);
    const supabase = createServerClient();
    
    const { data: service, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", validServiceId)
      .eq("active", true)
      .single();

    if (error) {
      console.error(`❌ [getServiceById] Error:`, error);
      
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: `Service not found: ${serviceId}`,
          details: error
        };
      }
      
      return {
        success: false,
        error: `Error fetching service: ${error.message}`,
        details: error
      };
    }

    console.log(`✅ [getServiceById] Found service: ${service.title}`);
    
    return {
      success: true,
      data: service
    };

  } catch (error) {
    console.error(`❌ [getServiceById] Unexpected error:`, error);
    return {
      success: false,
      error: "Unexpected error fetching service",
      details: error
    };
  }
}