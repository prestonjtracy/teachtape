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
  const [initialized, setInitialized] = useState(false);

  // Memoize supabase client to prevent recreation on each render
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('🔍 [AuthContext] Fetching profile for userId:', userId);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, auth_user_id')
        .eq('auth_user_id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('ℹ️ [AuthContext] No profile found for user (PGRST116)');
        } else {
          console.error('❌ [AuthContext] Profile fetch error:', profileError.message, profileError.code);
        }
        return null;
      }

      console.log('✅ [AuthContext] Profile fetched successfully:', profileData?.full_name);
      return profileData;
    } catch (err) {
      console.error('❌ [AuthContext] Profile fetch failed:', err);
      return null;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      console.log('🔄 [AuthContext] Refreshing auth state...');
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [AuthContext] Auth refresh error:', userError);
        setError(userError.message);
        setUser(null);
        setProfile(null);
        return;
      }

      console.log('👤 [AuthContext] User:', currentUser ? 'authenticated' : 'not authenticated');
      setUser(currentUser);
      setError(null);

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id);
        setProfile(profileData);
        console.log('✅ [AuthContext] Profile loaded:', profileData?.full_name || 'No name', 'Role:', profileData?.role);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('❌ [AuthContext] Auth refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Auth refresh failed');
      setUser(null);
      setProfile(null);
    }
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 [AuthContext] Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setError(null);
    } catch (err) {
      console.error('❌ [AuthContext] Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
    }
  }, [supabase]);

  // Initialize auth and set up listener - run once on mount
  useEffect(() => {
    let isMounted = true;
    let authStateReceived = false;

    console.log('🚀 [AuthContext] Initializing auth...');

    // Safety timeout - if nothing happens in 3 seconds, just set loading to false
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !authStateReceived) {
        console.warn('⏰ [AuthContext] Safety timeout - forcing initialization complete');
        setLoading(false);
        setInitialized(true);
      }
    }, 3000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        authStateReceived = true;
        clearTimeout(safetyTimeout);

        console.log('🔄 [AuthContext] Auth state changed:', event, session?.user ? 'user present' : 'no user');

        setUser(session?.user ?? null);
        setError(null);

        if (session?.user) {
          // Fetch profile
          try {
            const profileData = await fetchProfile(session.user.id);
            if (isMounted) {
              setProfile(profileData);
              console.log('✅ [AuthContext] Profile loaded:', profileData?.full_name || 'No profile found');
            }
          } catch (err) {
            console.error('❌ [AuthContext] Profile fetch error in listener:', err);
          }
        } else {
          setProfile(null);
        }

        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    // Trigger initial session check - this should fire the onAuthStateChange
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('📋 [AuthContext] getSession result:', session ? 'session exists' : 'no session', error?.message || '');

      // If getSession returns but onAuthStateChange hasn't fired yet, handle it
      if (isMounted && !authStateReceived) {
        if (!session) {
          console.log('ℹ️ [AuthContext] No session, marking as initialized');
          clearTimeout(safetyTimeout);
          setLoading(false);
          setInitialized(true);
        }
        // If session exists, onAuthStateChange should fire - if not, safety timeout will handle it
      }
    }).catch(err => {
      console.error('❌ [AuthContext] getSession error:', err);
      if (isMounted) {
        clearTimeout(safetyTimeout);
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      console.log('🧹 [AuthContext] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signOut,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}