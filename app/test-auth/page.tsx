'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestAuthPage() {
  const [status, setStatus] = useState('Loading...');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    async function testAuth() {
      try {
        const supabase = createClient();
        
        // Test authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setStatus('❌ Not authenticated');
          setDetails({ error: userError?.message || 'No user' });
          return;
        }

        // Test profile fetch
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('auth_user_id', user.id)
          .single();

        if (profileError) {
          setStatus('❌ Profile fetch failed');
          setDetails({ 
            user: user.email,
            profileError: profileError.message
          });
          return;
        }

        setStatus('✅ Authentication working!');
        setDetails({
          user: user.email,
          profile: profile,
          confirmed: !!user.email_confirmed_at
        });

      } catch (error) {
        setStatus('❌ Unexpected error');
        setDetails({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    testAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold mb-4">Authentication Test</h1>
        
        <div className="mb-4">
          <strong>Status:</strong> {status}
        </div>

        {details && (
          <div>
            <strong>Details:</strong>
            <pre className="bg-gray-100 p-3 rounded mt-2 text-sm overflow-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 space-x-4">
          <a 
            href="/coaches" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Coaches
          </a>
          <a 
            href="/dashboard" 
            className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Try Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}