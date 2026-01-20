import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET() {
  try {
    console.log('🔍 [API /profile] Starting...');

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ [API /profile] No user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('✅ [API /profile] User authenticated:', user.email);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ [API /profile] Profile error:', profileError);
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }

    console.log('✅ [API /profile] Profile loaded:', profile?.full_name || 'No profile yet');

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile || null
    });

  } catch (error) {
    console.error('❌ [API /profile] Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
