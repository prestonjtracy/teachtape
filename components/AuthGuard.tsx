'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/auth/login' }: AuthGuardProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        const currentPath = window.location.pathname;
        router.push(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
        return;
      }
      
      setUser(user);
      setLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          const currentPath = window.location.pathname;
          router.push(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
        } else if (session) {
          setUser(session.user);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}