'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  auth_user_id: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize supabase client to prevent recreation on each render
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('🔍 [AuthContext] Fetching profile for userId:', userId);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('❌ [AuthContext] Profile API error:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.profile) {
        console.log('✅ [AuthContext] Profile fetched:', data.profile.full_name);
        return data.profile;
      }
      return null;
    } catch (err) {
      console.error('❌ [AuthContext] Profile fetch error:', err);
      return null;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      console.log('🔄 [AuthContext] Refreshing auth...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('❌ [AuthContext] Refresh error:', err);
    }
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 [AuthContext] Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      window.location.href = '/';
    } catch (err) {
      console.error('❌ [AuthContext] Sign out error:', err);
      window.location.href = '/';
    }
  }, [supabase]);

  // Initialize auth on mount
  useEffect(() => {
    let isMounted = true;
    let loadingResolved = false;
    console.log('🚀 [AuthContext] Initializing...');

    const resolveLoading = () => {
      if (!loadingResolved && isMounted) {
        loadingResolved = true;
        setLoading(false);
        console.log('✅ [AuthContext] Loading resolved');
      }
    };

    // Force loading to false after 2 seconds - shorter timeout for better UX
    const forceTimeout = setTimeout(() => {
      console.warn('⚠️ [AuthContext] Force timeout - setting loading false');
      resolveLoading();
    }, 2000);

    // Primary method: directly get session on mount
    const initializeAuth = async () => {
      try {
        console.log('📋 [AuthContext] Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ [AuthContext] getSession error:', error);
        } else {
          console.log('📋 [AuthContext] Session result:', session ? 'found' : 'none');

          if (session?.user) {
            console.log('👤 [AuthContext] User:', session.user.email);
            setUser(session.user);

            // Fetch profile in background
            fetchProfile(session.user.id).then(profileData => {
              if (isMounted) setProfile(profileData);
            });
          } else {
            setUser(null);
            setProfile(null);
          }
        }

        clearTimeout(forceTimeout);
        resolveLoading();
      } catch (err) {
        console.error('❌ [AuthContext] Init error:', err);
        clearTimeout(forceTimeout);
        resolveLoading();
      }
    };

    initializeAuth();

    // Also listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 [AuthContext] Auth event:', event);

        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id).then(profileData => {
            if (isMounted) setProfile(profileData);
          });
        } else {
          setUser(null);
          setProfile(null);
        }

        // Resolve loading if still pending
        clearTimeout(forceTimeout);
        resolveLoading();
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(forceTimeout);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
