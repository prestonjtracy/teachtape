/**
 * Zoom Integration for TeachTape
 *
 * This module provides Zoom meeting creation and management for coaching sessions.
 * It includes graceful fallback when Zoom credentials are not configured.
 */

import * as ZoomAPI from './zoom/api';

export interface ZoomMeeting {
  join_url: string | null;
  start_url: string | null;
  meeting_id?: string;
  password?: string;
}

export interface ZoomMeetingRequest {
  topic: string;
  start_time: Date;
  duration: number; // in minutes
  host_email?: string;
  attendee_email?: string;
}

/**
 * Check if Zoom integration is configured
 */
export function isZoomConfigured(): boolean {
  return !!(
    process.env.ZOOM_CLIENT_ID &&
    process.env.ZOOM_CLIENT_SECRET &&
    process.env.ZOOM_ACCOUNT_ID
  );
}

/**
 * Create a Zoom meeting for a coaching session
 *
 * If Zoom is not configured, returns null URLs with a warning.
 * This allows the booking system to function without Zoom.
 */
export async function createZoomMeeting(request: ZoomMeetingRequest): Promise<ZoomMeeting> {
  console.log(`🎥 [createZoomMeeting] Creating meeting for:`, {
    topic: request.topic,
    start_time: request.start_time.toISOString(),
    duration: request.duration,
    host_email: request.host_email,
    attendee_email: request.attendee_email
  });

  // Check if Zoom is configured
  if (!isZoomConfigured()) {
    console.warn(`⚠️ [createZoomMeeting] Zoom credentials not configured. Meeting URLs will be null.`);
    console.warn(`⚠️ To enable Zoom: Set ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_ACCOUNT_ID in your environment.`);

    return {
      join_url: null,
      start_url: null,
      meeting_id: undefined,
      password: undefined
    };
  }

  try {
    // Call real Zoom API
    const meeting = await ZoomAPI.createMeeting({
      topic: request.topic,
      start_time: request.start_time.toISOString(),
      duration: request.duration,
      coach_email: request.host_email || '',
      athlete_name: request.attendee_email || undefined,
    });

    console.log(`✅ [createZoomMeeting] Meeting created successfully:`, meeting.id);

    return {
      join_url: meeting.join_url,
      start_url: meeting.host_join_url,
      meeting_id: meeting.id,
      password: meeting.password
    };
  } catch (error) {
    console.error(`❌ [createZoomMeeting] Failed to create meeting:`, error);

    // Return null URLs on error to allow booking to continue
    return {
      join_url: null,
      start_url: null,
      meeting_id: undefined,
      password: undefined
    };
  }
}

