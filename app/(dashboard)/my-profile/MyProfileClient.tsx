'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Toast from '@/components/Toast';
import AvatarUploader from '@/components/AvatarUploader';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  bio: string;
  sport: string;
  avatar_url: string;
}

const SPORTS_OPTIONS = [
  'Basketball',
  'Football',
  'Soccer',
  'Tennis',
  'Baseball',
  'Golf',
  'Swimming',
  'Track & Field',
  'Wrestling',
  'Volleyball',
  'Hockey',
  'Lacrosse',
  'Other'
];

export default function MyProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'coach',
    bio: '',
    sport: '',
    avatar_url: ''
  });
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });
  
  // Create Supabase client directly to bypass any config issues
  const supabase = createBrowserClient(
    'https://atjwhulpsbloxubpkjkl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0andodWxwc2Jsb3h1YnBramtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDE4NTIsImV4cCI6MjA3MDY3Nzg1Mn0.A2-1tp06noivdE7ZReyPWv_1DYHTrbgbp_zrsj7jxbQ'
  );

  useEffect(() => {
    let isMounted = true;
    let authTimeout: NodeJS.Timeout;

    async function loadUser() {
      try {
        if (!isMounted) return;
        
        console.log('🔍 Loading user...');
        console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('🔧 Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        
        // Set a timeout for the auth request
        authTimeout = setTimeout(() => {
          console.error('❌ Auth request timed out after 5 seconds');
          if (isMounted) {
            setInitialLoading(false);
          }
        }, 5000);
        
        console.log('🔄 Making auth request...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // Clear timeout if request completed
        clearTimeout(authTimeout);
        
        if (!isMounted) return;
        
        if (authError) {
          console.error('Auth error:', authError);
          setInitialLoading(false);
          return;
        }
        
        console.log('👤 User loaded:', user?.email || 'No email');
        console.log('👤 User ID:', user?.id || 'No ID');
        setUser(user);
        
        if (user) {
          console.log('📝 Loading profile for user:', user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();
          
          if (!isMounted) return;
          
          if (profileError) {
            console.error('Profile error:', profileError);
            if (profileError.code === 'PGRST116') {
              console.log('📝 No profile found, will show create form');
            }
          } else {
            console.log('✅ Profile loaded:', profile?.full_name);
          }
          
          if (profile) {
            setProfile(profile);
            setFormData({
              full_name: profile.full_name || '',
              role: profile.role || 'coach',
              bio: profile.bio || '',
              sport: profile.sport || '',
              avatar_url: profile.avatar_url || ''
            });
          }
        } else {
          console.warn('⚠️ No user found - might not be authenticated');
        }
      } catch (error) {
        console.error('Load user error:', error);
      } finally {
        if (isMounted) {
          console.log('✅ Loading complete');
          setInitialLoading(false);
        }
      }
    }
    
    // Add a small delay to prevent rapid re-renders in dev mode
    const delayedLoad = setTimeout(() => {
      loadUser();
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(delayedLoad);
      clearTimeout(authTimeout);
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(formData)
          .eq('id', profile.id);
        
        if (error) throw error;
        setToast({ show: true, message: 'Profile updated successfully!', type: 'success' });
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            auth_user_id: user.id,
            ...formData
          });
        
        if (error) throw error;
        setToast({ show: true, message: 'Profile created successfully!', type: 'success' });
        // Reload to get the new profile
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error: any) {
      setToast({ show: true, message: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-4">Unable to load user session. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background-subtle">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[#123C7A] mb-2">My Profile</h1>
            <p className="text-lg text-neutral-text-secondary">Manage your personal information and settings</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-8">
              {/* Avatar Section */}
              <div>
                <h3 className="text-lg font-semibold text-[#123C7A] mb-4">Profile Photo</h3>
                <AvatarUploader
                  value={formData.avatar_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                  userEmail={user?.email}
                />
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-text mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#123C7A] focus:border-[#123C7A] transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-text mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#123C7A] focus:border-[#123C7A] transition-colors"
                  >
                    <option value="coach">Coach</option>
                    <option value="athlete">Athlete</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Sport */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-neutral-text mb-2">
                    Primary Sport
                  </label>
                  <select
                    value={formData.sport}
                    onChange={(e) => setFormData(prev => ({ ...prev, sport: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#123C7A] focus:border-[#123C7A] transition-colors"
                  >
                    <option value="">Select a sport...</option>
                    {SPORTS_OPTIONS.map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>

                {/* Bio */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-neutral-text mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#123C7A] focus:border-[#123C7A] transition-colors resize-none"
                    placeholder="Tell us about yourself, your experience, and what makes you unique..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-[#FF5A1F] text-white px-6 py-4 rounded-lg font-semibold hover:bg-[#E44F1B] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </div>
                  ) : profile ? 'Update Profile' : 'Create Profile'}
                </button>
                
                {profile && (
                  <button 
                    type="button" 
                    onClick={() => setFormData({
                      full_name: profile.full_name || '',
                      role: profile.role || 'coach',
                      bio: profile.bio || '',
                      sport: profile.sport || '',
                      avatar_url: profile.avatar_url || ''
                    })}
                    className="px-6 py-4 border border-gray-300 text-neutral-text rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
                  >
                    Reset Changes
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
      
      <Toast 
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </main>
  );
}