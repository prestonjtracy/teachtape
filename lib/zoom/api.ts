/**
 * Zoom API Client for TeachTape
 * 
 * This module provides functions for interacting with the Zoom API
 * to create and manage meetings for coaching sessions.
 */

import { ZOOM_CONFIG, ZOOM_MEETING_DEFAULTS, validateZoomConfig } from './config'

export interface ZoomMeetingDetails {
  id: string
  topic: string
  start_time: string
  duration: number
  timezone: string
  join_url: string
  host_join_url: string
  password?: string
}

export interface CreateMeetingParams {
  topic: string
  start_time: string // ISO 8601 format
  duration: number // in minutes
  coach_email: string
  athlete_name?: string
  additional_settings?: Partial<typeof ZOOM_MEETING_DEFAULTS.settings>
}

/**
 * Get OAuth token for Zoom API access
 * In production, this should be stored and refreshed as needed
 */
async function getAccessToken(): Promise<string> {
  validateZoomConfig()
  
  const credentials = Buffer.from(
    `${ZOOM_CONFIG.CLIENT_ID}:${ZOOM_CONFIG.CLIENT_SECRET}`
  ).toString('base64')

  // For server-to-server OAuth apps (recommended for production)
  const response = await fetch(`${ZOOM_CONFIG.TOKEN_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: process.env.ZOOM_ACCOUNT_ID!,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to get Zoom access token: ${error.error_description || error.error}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Create a Zoom meeting for a coaching session
 */
export async function createMeeting(params: CreateMeetingParams): Promise<ZoomMeetingDetails> {
  try {
    const accessToken = await getAccessToken()
    
    // Format the topic to include participant names
    const topic = params.athlete_name 
      ? `${params.topic} - ${params.athlete_name}`
      : params.topic

    const meetingData = {
      topic,
      type: ZOOM_MEETING_DEFAULTS.type,
      start_time: params.start_time,
      duration: params.duration,
      timezone: ZOOM_MEETING_DEFAULTS.timezone,
      settings: {
        ...ZOOM_MEETING_DEFAULTS.settings,
        ...params.additional_settings,
      },
    }

    const response = await fetch(`${ZOOM_CONFIG.API_BASE_URL}/users/me/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to create Zoom meeting: ${error.message || 'Unknown error'}`)
    }

    const meeting = await response.json()
    
    return {
      id: meeting.id.toString(),
      topic: meeting.topic,
      start_time: meeting.start_time,
      duration: meeting.duration,
      timezone: meeting.timezone,
      join_url: meeting.join_url,
      host_join_url: meeting.start_url,
      password: meeting.password,
    }
  } catch (error) {
    console.error('❌ [Zoom API] Failed to create meeting:', error)
    throw error
  }
}

/**
 * Update an existing Zoom meeting
 */
export async function updateMeeting(
  meetingId: string, 
  updates: Partial<CreateMeetingParams>
): Promise<void> {
  try {
    const accessToken = await getAccessToken()
    
    const updateData: any = {}
    
    if (updates.topic) updateData.topic = updates.topic
    if (updates.start_time) updateData.start_time = updates.start_time
    if (updates.duration) updateData.duration = updates.duration
    if (updates.additional_settings) updateData.settings = updates.additional_settings

    const response = await fetch(`${ZOOM_CONFIG.API_BASE_URL}/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update Zoom meeting: ${error.message || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('❌ [Zoom API] Failed to update meeting:', error)
    throw error
  }
}

/**
 * Delete a Zoom meeting
 */
export async function deleteMeeting(meetingId: string): Promise<void> {
  try {
    const accessToken = await getAccessToken()
    
    const response = await fetch(`${ZOOM_CONFIG.API_BASE_URL}/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok && response.status !== 404) {
      const error = await response.json()
      throw new Error(`Failed to delete Zoom meeting: ${error.message || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('❌ [Zoom API] Failed to delete meeting:', error)
    throw error
  }
}

/**
 * Get meeting details
 */
export async function getMeetingDetails(meetingId: string): Promise<ZoomMeetingDetails | null> {
  try {
    const accessToken = await getAccessToken()
    
    const response = await fetch(`${ZOOM_CONFIG.API_BASE_URL}/meetings/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null // Meeting not found
      }
      const error = await response.json()
      throw new Error(`Failed to get meeting details: ${error.message || 'Unknown error'}`)
    }

    const meeting = await response.json()
    
    return {
      id: meeting.id.toString(),
      topic: meeting.topic,
      start_time: meeting.start_time,
      duration: meeting.duration,
      timezone: meeting.timezone,
      join_url: meeting.join_url,
      host_join_url: meeting.start_url,
      password: meeting.password,
    }
  } catch (error) {
    console.error('❌ [Zoom API] Failed to get meeting details:', error)
    return null
  }
}