import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const logZoomClickSchema = z.object({
  booking_id: z.string().uuid(),
  action_type: z.enum(['start_meeting', 'join_meeting']),
});

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/zoom-logs] Request received');
    
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    
    // Get current user and verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [GET /api/zoom-logs] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [GET /api/zoom-logs] Profile error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is admin
    if (profile.role !== 'admin') {
      console.error('❌ [GET /api/zoom-logs] Access denied - not admin');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('✅ [GET /api/zoom-logs] Admin access verified');

    // Fetch zoom logs using admin client to bypass RLS, with user and booking data
    const { data: logs, error: logsError } = await adminSupabase
      .from('zoom_session_logs')
      .select(`
        id,
        booking_id,
        action_type,
        user_agent,
        ip_address,
        created_at,
        coach_id,
        athlete_id,
        coach:profiles!zoom_session_logs_coach_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        athlete:profiles!zoom_session_logs_athlete_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        booking:bookings!zoom_session_logs_booking_id_fkey (
          id,
          listing:listings!bookings_listing_id_fkey (
            id,
            title
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      console.error('❌ [GET /api/zoom-logs] Error fetching logs:', logsError);
      return NextResponse.json({ 
        error: 'Failed to fetch logs',
        details: logsError.message 
      }, { status: 500 });
    }

    console.log('✅ [GET /api/zoom-logs] Successfully fetched', logs?.length || 0, 'logs');

    return NextResponse.json({
      logs: logs || [],
      count: logs?.length || 0
    });

  } catch (error) {
    console.error('❌ [GET /api/zoom-logs] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/zoom-logs] Request received');
    
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [POST /api/zoom-logs] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [POST /api/zoom-logs] Profile error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const validation = logZoomClickSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('❌ [POST /api/zoom-logs] Validation error:', validation.error);
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { booking_id, action_type } = validation.data;

    console.log('✅ [POST /api/zoom-logs] Input validated:', {
      booking_id,
      action_type,
      user_id: profile.id,
      user_role: profile.role
    });

    // Get booking details to find coach and athlete
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        coach_id,
        athlete_id,
        booking_requests!inner(
          id,
          coach_id,
          athlete_id
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('❌ [POST /api/zoom-logs] Booking not found:', bookingError);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user is part of this booking
    const isCoach = profile.id === booking.coach_id;
    const isAthlete = profile.id === booking.athlete_id;
    
    if (!isCoach && !isAthlete) {
      console.error('❌ [POST /api/zoom-logs] User not part of booking');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify action type matches user role
    if (action_type === 'start_meeting' && !isCoach) {
      console.error('❌ [POST /api/zoom-logs] Only coaches can start meetings');
      return NextResponse.json({ error: 'Only coaches can start meetings' }, { status: 403 });
    }

    if (action_type === 'join_meeting' && !isAthlete) {
      console.error('❌ [POST /api/zoom-logs] Only athletes can join meetings');
      return NextResponse.json({ error: 'Only athletes can join meetings' }, { status: 403 });
    }

    // Insert log entry (without storing IP addresses or user agents for privacy)
    const { data: logEntry, error: logError } = await supabase
      .from('zoom_session_logs')
      .insert({
        booking_id,
        coach_id: booking.coach_id,
        athlete_id: booking.athlete_id,
        action_type,
        user_agent: null, // Privacy: Not storing browser info
        ip_address: null, // Privacy: Not storing IP addresses
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ [POST /api/zoom-logs] Failed to insert log:', logError);
      return NextResponse.json({ error: 'Failed to log action' }, { status: 500 });
    }

    console.log('✅ [POST /api/zoom-logs] Successfully logged zoom action:', {
      log_id: logEntry.id,
      booking_id,
      action_type,
      user_role: profile.role
    });

    return NextResponse.json({ 
      success: true, 
      log_id: logEntry.id 
    }, { status: 201 });

  } catch (error) {
    console.error('❌ [POST /api/zoom-logs] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}