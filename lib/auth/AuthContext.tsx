'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, auth_user_id')
        .eq('auth_user_id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ [AuthContext] Profile fetch error:', profileError);
        return null;
      }
      
      return profileData;
    } catch (err) {
      console.error('❌ [AuthContext] Profile fetch failed:', err);
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

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      console.log('🚀 [AuthContext] Initializing auth...');
      
      // Set a maximum timeout for initialization
      const timeoutId = setTimeout(() => {
        if (isMounted && !initialized) {
          console.log('⏰ [AuthContext] Initialization timeout reached');
          setLoading(false);
          setInitialized(true);
        }
      }, 2000);

      try {
        await refreshAuth();
        
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
          clearTimeout(timeoutId);
          console.log('✅ [AuthContext] Auth initialization complete');
        }
      } catch (err) {
        console.error('❌ [AuthContext] Auth initialization failed:', err);
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshAuth, initialized]);

  // Listen for auth state changes
  useEffect(() => {
    if (!initialized) return;

    console.log('👂 [AuthContext] Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 [AuthContext] Auth state changed:', event, session?.user ? 'user present' : 'no user');
        
        setUser(session?.user ?? null);
        setError(null);
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          console.log('✅ [AuthContext] Auth change profile loaded:', profileData?.full_name || 'No name');
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 [AuthContext] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, initialized]);

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