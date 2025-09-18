'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthDebugPage() {
  const [authState, setAuthState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const supabase = createClient();
    
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        setAuthState({
          session: session,
          user: user,
          sessionError: error,
          userError: userError,
          cookies: document.cookie
        });
      } catch (err) {
        setAuthState({ error: err });
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  if (loading) return <div>Loading auth state...</div>;
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Info</h1>
      <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
        {JSON.stringify(authState, null, 2)}
      </pre>
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Test API Call</h2>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('/api/payment-methods/check');
              const data = await response.json();
              alert(`API Response: ${JSON.stringify(data, null, 2)}`);
            } catch (err) {
              alert(`API Error: ${err}`);
            }
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Payment Methods API
        </button>
      </div>
    </div>
  );
}