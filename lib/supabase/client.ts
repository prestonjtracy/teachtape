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
        // Removed custom storageKey to use default Supabase cookie names
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
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