import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Allow debug endpoint for authenticated users (they can only see their own data anyway)

  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({
        status: "auth_error",
        error: authError.message,
        details: "Failed to get authenticated user"
      }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({
        status: "not_authenticated",
        details: "No authenticated user found"
      }, { status: 401 });
    }

    console.log(`🔍 [Profile Check] Checking profile for user: ${user.id}, email: ${user.email}`);

    // Check for profile by auth_user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role, auth_user_id, created_at')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError) {
      console.error(`❌ [Profile Check] Profile query error:`, profileError);

      // If no profile found, check if there might be one with email match
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('id, full_name, role, auth_user_id')
        .limit(5);

      return NextResponse.json({
        status: "profile_not_found",
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        error: profileError.message,
        error_code: profileError.code,
        suggestion: "Profile may need to be created or auth_user_id may be mismatched",
        sample_profiles: profileByEmail?.slice(0, 3).map(p => ({
          id: p.id,
          auth_user_id: p.auth_user_id,
          matches: p.auth_user_id === user.id
        }))
      });
    }

    return NextResponse.json({
      status: "ok",
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        auth_user_id: profile.auth_user_id,
        auth_user_id_matches: profile.auth_user_id === user.id,
        created_at: profile.created_at
      }
    });

  } catch (error) {
    console.error(`❌ [Profile Check] Unexpected error:`, error);
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
