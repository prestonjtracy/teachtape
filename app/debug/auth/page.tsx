'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthDebugPage() {
  const [authState, setAuthState] = useState<any>(null);
  const [profileState, setProfileState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const checkAuth = async () => {
      try {
        console.log('🔍 [Debug] Starting auth check...');

        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('📋 [Debug] getSession result:', session ? 'session exists' : 'no session', error?.message || '');

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('👤 [Debug] getUser result:', user ? 'user exists' : 'no user', userError?.message || '');

        setAuthState({
          session: session ? {
            accessToken: session.access_token?.substring(0, 30) + '...',
            refreshToken: session.refresh_token?.substring(0, 20) + '...',
            expiresAt: session.expires_at,
            user: session.user?.email
          } : null,
          user: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          } : null,
          sessionError: error?.message || null,
          userError: userError?.message || null,
          cookies: document.cookie.split(';').filter(c => c.includes('sb-')).map(c => c.trim().split('=')[0])
        });

        // Now try to fetch profile directly from client
        if (user) {
          console.log('🔍 [Debug] Fetching profile for user:', user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role, auth_user_id')
            .eq('auth_user_id', user.id)
            .single();

          console.log('📋 [Debug] Profile result:', profile ? 'found' : 'not found', profileError?.message || '');

          setProfileState({
            profile: profile,
            error: profileError ? {
              message: profileError.message,
              code: profileError.code,
              details: profileError.details,
              hint: profileError.hint
            } : null
          });
        }
      } catch (err) {
        console.error('❌ [Debug] Error:', err);
        setAuthState({ error: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) return <div className="p-8">Loading auth state...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Info</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Auth State (Client-Side)</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-80">
          {JSON.stringify(authState, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Profile Fetch (Client-Side RLS Test)</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-80">
          {JSON.stringify(profileState, null, 2)}
        </pre>
        {profileState?.error && (
          <div className="mt-2 p-3 bg-red-100 text-red-800 rounded">
            <strong>Profile Error:</strong> {profileState.error.message}
            {profileState.error.code && <span> (Code: {profileState.error.code})</span>}
          </div>
        )}
      </div>

      <div className="mt-4 space-x-4">
        <button
          onClick={async () => {
            try {
              const response = await fetch('/api/debug/client-auth');
              const data = await response.json();
              alert(`Server-Side Auth:\n${JSON.stringify(data, null, 2)}`);
            } catch (err) {
              alert(`API Error: ${err}`);
            }
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Server-Side Auth
        </button>

        <button
          onClick={async () => {
            try {
              const response = await fetch('/api/debug/profile-check');
              const data = await response.json();
              alert(`Profile Check:\n${JSON.stringify(data, null, 2)}`);
            } catch (err) {
              alert(`API Error: ${err}`);
            }
          }}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Test Profile Check API
        </button>

        <button
          onClick={() => window.location.reload()}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Reload Page
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded border border-yellow-200">
        <h3 className="font-semibold text-yellow-800">Debug Steps:</h3>
        <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
          <li>Check if <strong>Auth State</strong> shows a user - if not, you&apos;re not logged in client-side</li>
          <li>Check if <strong>Profile Fetch</strong> shows an error - PGRST116 means RLS blocked the query</li>
          <li>Click <strong>Test Server-Side Auth</strong> to see if the server sees you as authenticated</li>
          <li>Open browser console (F12) to see detailed logs</li>
        </ol>
      </div>
    </div>
  );
}