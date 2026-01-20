import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get session info
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    // Get user info
    const { data: userData, error: userError } = await supabase.auth.getUser();

    // Log all cookies for debugging
    const cookies = req.cookies.getAll();
    const authCookies = cookies.filter(c => c.name.includes('sb-') || c.name.includes('auth'));

    // Try to fetch profile if user exists
    let profileResult = null;
    if (userData?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, auth_user_id')
        .eq('auth_user_id', userData.user.id)
        .single();

      profileResult = {
        data: profile,
        error: profileError ? { message: profileError.message, code: profileError.code } : null
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      cookies: {
        total: cookies.length,
        authRelated: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length || 0
        }))
      },
      session: {
        exists: !!sessionData?.session,
        error: sessionError ? sessionError.message : null,
        accessToken: sessionData?.session?.access_token ?
          `${sessionData.session.access_token.substring(0, 20)}...` : null,
        expiresAt: sessionData?.session?.expires_at
      },
      user: {
        exists: !!userData?.user,
        error: userError ? userError.message : null,
        id: userData?.user?.id,
        email: userData?.user?.email
      },
      profile: profileResult
    });

  } catch (error) {
    console.error(`[Debug Client Auth] Error:`, error);
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
