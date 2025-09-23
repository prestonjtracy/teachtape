import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'Cache-Control': 'no-cache',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
    }
  )
}

// Legacy export for backwards compatibility
export const supabase = createClient()