import { NextRequest, NextResponse } from "next/server";
import { createClientForApiRoute } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('🔍 [test-auth-api] Request received');
  
  try {
    const supabase = createClientForApiRoute(req);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('[test-auth-api] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      error: userError?.message 
    });
    
    if (userError || !user) {
      console.error('[test-auth-api] Authentication failed:', userError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Authentication required",
          details: userError?.message 
        },
        { status: 401 }
      );
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('auth_user_id', user.id)
      .single();

    console.log('[test-auth-api] Profile check:', { 
      hasProfile: !!profile, 
      profileId: profile?.id,
      role: profile?.role,
      error: profileError?.message 
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailConfirmed: !!user.email_confirmed_at
      },
      profile: profile || null,
      profileError: profileError?.message || null
    });

  } catch (error) {
    console.error('❌ [test-auth-api] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}