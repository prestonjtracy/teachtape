import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🔍 [DEBUG SESSION] Checking session state...');

  // Log all cookies from the request
  const cookies = request.cookies.getAll();
  console.log('🍪 [DEBUG SESSION] Cookies present:', cookies.map(c => ({
    name: c.name,
    valueLength: c.value?.length || 0,
    hasValue: !!c.value
  })));

  // Check for Supabase cookies specifically
  const supabaseCookies = cookies.filter(c => c.name.startsWith('sb-'));
  console.log('🔐 [DEBUG SESSION] Supabase cookies:', supabaseCookies.map(c => c.name));

  try {
    const supabase = createClient();

    // Try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 [DEBUG SESSION] getSession result:', {
      hasSession: !!session,
      error: sessionError?.message,
      userId: session?.user?.id?.substring(0, 8),
      expiresAt: session?.expires_at
    });

    // Try to get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 [DEBUG SESSION] getUser result:', {
      hasUser: !!user,
      error: userError?.message,
      userId: user?.id?.substring(0, 8),
      email: user?.email
    });

    return NextResponse.json({
      debug: true,
      timestamp: new Date().toISOString(),
      cookies: {
        total: cookies.length,
        supabase: supabaseCookies.length,
        names: supabaseCookies.map(c => c.name)
      },
      session: {
        exists: !!session,
        error: sessionError?.message || null,
        expiresAt: session?.expires_at || null,
        userId: session?.user?.id || null
      },
      user: {
        exists: !!user,
        error: userError?.message || null,
        id: user?.id || null,
        email: user?.email || null
      }
    });
  } catch (error) {
    console.error('❌ [DEBUG SESSION] Error:', error);
    return NextResponse.json({
      debug: true,
      error: error instanceof Error ? error.message : 'Unknown error',
      cookies: {
        total: cookies.length,
        supabase: supabaseCookies.length,
        names: supabaseCookies.map(c => c.name)
      }
    }, { status: 500 });
  }
}
