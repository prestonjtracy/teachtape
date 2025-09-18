'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthStatus {
  user: any;
  session: any;
  isLoading: boolean;
}

export default function AuthStatusPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    user: null,
    session: null,
    isLoading: true
  });

  useEffect(() => {
    const supabase = createClient();
    
    const getAuthStatus = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        setAuthStatus({
          user,
          session,
          isLoading: false
        });

        console.log('Auth Status:', {
          user,
          session,
          sessionError,
          userError,
          emailConfirmed: user?.email_confirmed_at,
          userMetadata: user?.user_metadata
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthStatus({
          user: null,
          session: null,
          isLoading: false
        });
      }
    };

    getAuthStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setAuthStatus(prev => ({
        ...prev,
        session,
        user: session?.user || null
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const resendConfirmation = async () => {
    if (!authStatus.user?.email) return;
    
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: authStatus.user.email
    });

    if (error) {
      alert('Error resending confirmation: ' + error.message);
    } else {
      alert('Confirmation email sent! Check your inbox.');
    }
  };

  if (authStatus.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading auth status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-xl font-bold mb-4">Authentication Status</h1>
          
          <div className="space-y-4">
            <div>
              <strong>User:</strong>
              {authStatus.user ? (
                <div className="mt-2 p-3 bg-gray-100 rounded">
                  <p><strong>Email:</strong> {authStatus.user.email}</p>
                  <p><strong>ID:</strong> {authStatus.user.id}</p>
                  <p><strong>Email Confirmed:</strong> {
                    authStatus.user.email_confirmed_at ? 
                    `Yes (${new Date(authStatus.user.email_confirmed_at).toLocaleString()})` : 
                    'No'
                  }</p>
                  <p><strong>Created:</strong> {new Date(authStatus.user.created_at).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-red-600">No user found</p>
              )}
            </div>

            <div>
              <strong>Session:</strong>
              {authStatus.session ? (
                <div className="mt-2 p-3 bg-gray-100 rounded">
                  <p><strong>Access Token:</strong> {authStatus.session.access_token?.substring(0, 20)}...</p>
                  <p><strong>Expires:</strong> {new Date(authStatus.session.expires_at * 1000).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-red-600">No active session</p>
              )}
            </div>

            {authStatus.user && !authStatus.user.email_confirmed_at && (
              <div className="mt-4">
                <p className="text-amber-600 mb-2">⚠️ Email not confirmed</p>
                <button 
                  onClick={resendConfirmation}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Resend Confirmation Email
                </button>
              </div>
            )}

            {authStatus.user && authStatus.user.email_confirmed_at && (
              <div className="mt-4">
                <p className="text-green-600">✅ Email is confirmed!</p>
                <a 
                  href="/coaches"
                  className="inline-block mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Go to Coaches
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}