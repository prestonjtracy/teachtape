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

  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<Profile | null> => {
    console.log('🔍 [AuthContext] Fetching profile for userId:', userId, retryCount > 0 ? `(retry ${retryCount})` : '');

    // Debug: Check if supabase client is ready
    console.log('🔍 [AuthContext] Supabase client check - URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30));

    try {
      console.log('🔍 [AuthContext] Making profile query...');
      const { data: profileData, error: profileError, status, statusText } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, auth_user_id')
        .eq('auth_user_id', userId)
        .single();

      console.log('📋 [AuthContext] Profile query response - status:', status, 'statusText:', statusText);
      console.log('📋 [AuthContext] Profile data:', profileData);
      console.log('📋 [AuthContext] Profile error:', profileError);

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('ℹ️ [AuthContext] No profile found for user (PGRST116) - this means RLS blocked or no row exists');
          // Retry up to 2 times with delay - profile might not be created yet
          if (retryCount < 2) {
            console.log('🔄 [AuthContext] Retrying profile fetch in 500ms...');
            await new Promise(resolve => setTimeout(resolve, 500));
            return fetchProfile(userId, retryCount + 1);
          }
        } else {
          console.error('❌ [AuthContext] Profile fetch error:', profileError.message, 'code:', profileError.code, 'details:', profileError.details, 'hint:', profileError.hint);
          // Retry on other errors too
          if (retryCount < 2) {
            console.log('🔄 [AuthContext] Retrying profile fetch in 500ms...');
            await new Promise(resolve => setTimeout(resolve, 500));
            return fetchProfile(userId, retryCount + 1);
          }
        }
        return null;
      }

      console.log('✅ [AuthContext] Profile fetched successfully:', profileData?.full_name, 'role:', profileData?.role);
      return profileData;
    } catch (err) {
      console.error('❌ [AuthContext] Profile fetch exception:', err);
      // Retry on exception
      if (retryCount < 2) {
        console.log('🔄 [AuthContext] Retrying profile fetch in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchProfile(userId, retryCount + 1);
      }
      return null;
    }
  }, [supabase]);

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

    console.log('🚀 [AuthContext] Initializing auth...');

    // Safety timeout - if auth hasn't resolved in 5 seconds, stop loading
    // This prevents the infinite loading state
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ [AuthContext] Safety timeout reached - forcing loading to false');
        setLoading(false);
        setInitialized(true);
      }
    }, 5000);

    // Set up auth state listener FIRST - this is the primary way we get auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔄 [AuthContext] Auth state changed:', event, session?.user ? 'user present' : 'no user');

        // Update user immediately
        setUser(session?.user ?? null);
        setError(null);

        if (session?.user) {
          // Fetch profile - this is critical, so we wait for it
          console.log('🔍 [AuthContext] Fetching profile for userId:', session.user.id);
          try {
            const profileData = await fetchProfile(session.user.id);
            if (isMounted) {
              setProfile(profileData);
              console.log('✅ [AuthContext] Profile loaded:', profileData?.full_name || 'No profile found');
            }
          } catch (err) {
            console.error('❌ [AuthContext] Profile fetch error in listener:', err);
            if (isMounted) {
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
        }

        // ONLY set loading false AFTER profile is fetched
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
          console.log('✅ [AuthContext] Initialization complete');
        }
      }
    );

    // Trigger initial session check
    // Note: getSession() will cause onAuthStateChange to fire with INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('📋 [AuthContext] getSession result:', session ? 'session exists' : 'no session', error?.message || '');

      // Only handle the "no session" case here - if there's a session, onAuthStateChange handles it
      if (isMounted && !session && !error) {
        console.log('ℹ️ [AuthContext] No session found, marking as initialized');
        setLoading(false);
        setInitialized(true);
      }

      if (error) {
        console.error('❌ [AuthContext] getSession error:', error);
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    }).catch(err => {
      console.error('❌ [AuthContext] getSession exception:', err);
      if (isMounted) {
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