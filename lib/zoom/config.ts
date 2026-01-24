/**
 * Zoom API Configuration for TeachTape
 * 
 * This module handles Zoom API authentication and configuration
 * using OAuth 2.0 for secure meeting creation.
 */

export const ZOOM_CONFIG = {
  // OAuth App Configuration
  CLIENT_ID: process.env.ZOOM_CLIENT_ID!,
  CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET!,
  REDIRECT_URI: process.env.ZOOM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL}/api/zoom/callback`,
  
  // API Endpoints
  OAUTH_URL: 'https://zoom.us/oauth/authorize',
  TOKEN_URL: 'https://zoom.us/oauth/token',
  API_BASE_URL: 'https://api.zoom.us/v2',
  
  // Scopes needed for meeting creation
  SCOPES: 'meeting:write',
} as const

export const ZOOM_MEETING_DEFAULTS = {
  // Default meeting settings for TeachTape lessons
  type: 2, // Scheduled meeting
  duration: 60, // Default 1 hour duration
  timezone: 'America/New_York', // Default timezone
  settings: {
    host_video: true,
    participant_video: true,
    cn_meeting: false,
    in_meeting: false,
    join_before_host: true, // Allow participants to join without waiting for host
    mute_upon_entry: true,
    watermark: false,
    use_pmi: false,
    approval_type: 0, // Automatically approve
    audio: 'both', // Both telephone and computer audio
    auto_recording: 'none', // No automatic recording
    enforce_login: false,
    enforce_login_domains: '',
    alternative_hosts: '',
    registrants_email_notification: false,
    waiting_room: false, // Disabled - allow direct entry for coaching sessions
    allow_multiple_devices: true,
  }
} as const

// Validate required environment variables
export function validateZoomConfig() {
  const required = ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET', 'ZOOM_ACCOUNT_ID']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required Zoom environment variables: ${missing.join(', ')}`)
  }
}