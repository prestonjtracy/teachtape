import { NextResponse } from "next/server";
import { createMeeting } from "@/lib/zoom/api";

export async function GET() {
  try {
    console.log('🧪 [TEST] Testing Zoom API integration...');
    
    // Test creating a meeting
    const testMeeting = await createMeeting({
      topic: 'TeachTape Test Meeting',
      start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      duration: 30, // 30 minutes
      coach_email: 'test@teachtape.com',
      athlete_name: 'Test Athlete',
    });
    
    console.log('✅ [TEST] Zoom meeting created successfully:', testMeeting.id);
    
    return NextResponse.json({
      success: true,
      message: 'Zoom API integration working!',
      meeting: {
        id: testMeeting.id,
        topic: testMeeting.topic,
        join_url: testMeeting.join_url,
        host_join_url: testMeeting.host_join_url,
        start_time: testMeeting.start_time,
      }
    });

  } catch (error) {
    console.error('❌ [TEST] Zoom API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Zoom API integration test failed'
    }, { status: 500 });
  }
}