/**
 * Zoom Webhook Event Types
 * https://developers.zoom.us/docs/api/rest/webhook-reference/
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ZoomWebhookPayload {
  event: string;
  payload?: {
    plainToken?: string;
    object?: {
      id?: string | number;
      topic?: string;
      start_time?: string;
      end_time?: string;
      participant?: {
        user_name?: string;
        user_id?: string;
        email?: string;
        join_time?: string;
        leave_time?: string;
      };
    };
  };
}

// Type for Supabase client used in Zoom webhook handlers
export type ZoomSupabaseClient = SupabaseClient<any>;
