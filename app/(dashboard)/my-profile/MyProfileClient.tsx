'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Toast from '@/components/Toast';
import AvatarUploader from '@/components/AvatarUploader';
import CoachGallery from '@/components/CoachGallery';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  bio: string;
  sport: string;
  avatar_url: string;
}

interface MyProfileClientProps {
  initialUser?: any;
  initialProfile?: Profile | null;
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

export default function MyProfileClient({ initialUser, initialProfile }: MyProfileClientProps) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [user, setUser] = useState<any>(initialUser || null);
  const [formData, setFormData] = useState({
    full_name: initialProfile?.full_name || '',
    role: initialProfile?.role || 'coach',
    bio: initialProfile?.bio || '',
    sport: initialProfile?.sport || '',
    avatar_url: initialProfile?.avatar_url || ''
  });
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });
  
  // Create Supabase client using the proper factory
  const supabase = createClient();

  // Only run auth check if we don't have initial data
  useEffect(() => {
    if (initialUser && initialProfile !== undefined) {
      // We already have data from server, no need to load again
      return;
    }

    let isMounted = true;

    async function loadUser() {
      try {
        if (!isMounted) return;
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        
        if (authError) {
          console.error('Auth error:', authError);
          setInitialLoading(false);
          return;
        }
        
        setUser(user);
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();
          
          if (!isMounted) return;
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile error:', profileError);
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
        }
      } catch (error) {
        console.error('Load user error:', error);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }
    
    if (!initialUser) {
      setInitialLoading(true);
      loadUser();
    }
    
    return () => {
      isMounted = false;
    };
  }, [initialUser, initialProfile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      console.error('No user found for profile update');
      setToast({ show: true, message: 'Authentication error. Please sign in again.', type: 'error' });
      return;
    }
    
    setLoading(true);
    console.log('Starting profile update:', { formData, profile, userId: user.id });
    
    try {
      if (profile) {
        // Update existing profile
        console.log('Updating existing profile with ID:', profile.id);
        
        // Filter out role changes for non-admins
        const updateData = profile.role === 'admin' 
          ? formData 
          : (({ role, ...rest }) => {
              console.log('Non-admin user: role field removed from update');
              return rest;
            })(formData);
        
        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id)
          .select()
          .single();
        
        if (error) {
          console.error('Profile update error:', error);
          throw error;
        }
        
        console.log('Profile updated successfully:', data);
        setProfile(data);
        setToast({ show: true, message: 'Profile updated successfully!', type: 'success' });
        
        // Dispatch custom event to refresh header
        window.dispatchEvent(new Event('profileUpdated'));
      } else {
        // Create new profile
        console.log('Creating new profile for user:', user.id);
        
        // Prevent new users from creating admin profiles
        const createData = { ...formData };
        if (formData.role === 'admin') {
          createData.role = 'coach'; // Default new users to coach role
          console.log('Admin role blocked for new profile creation, defaulting to coach');
        }
        
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            auth_user_id: user.id,
            ...createData
          })
          .select()
          .single();
        
        if (error) {
          console.error('Profile creation error:', error);
          throw error;
        }
        
        console.log('Profile created successfully:', data);
        setProfile(data);
        setToast({ show: true, message: 'Profile created successfully!', type: 'success' });
        
        // Dispatch custom event to refresh header
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (error: any) {
      console.error('Profile save error:', error);
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

  if (!initialUser && !user) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-4">Unable to load user session. Please try signing in again.</p>
          <a 
            href="/auth/login" 
            className="bg-ttOrange text-white px-4 py-2 rounded-lg hover:bg-ttOrange/90 inline-block"
          >
            Sign In
          </a>
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

          {/* Navigation Tabs (Only for coaches) */}
          {formData.role === 'coach' && (
            <div className="flex justify-center gap-4 mt-6">
              <a
                href="/my-profile"
                className="px-6 py-2 text-sm font-medium border-b-2 border-[#FF5A1F] text-[#FF5A1F]"
              >
                Profile Info
              </a>
              <a
                href="/my-profile/payments"
                className="px-6 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-[#FF5A1F] hover:border-gray-300 transition-colors"
              >
                Payment Settings
              </a>
            </div>
          )}
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
                  {profile?.role === 'admin' ? (
                    // Admins can change roles (including other users' roles if needed)
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#123C7A] focus:border-[#123C7A] transition-colors"
                    >
                      <option value="coach">Coach</option>
                      <option value="athlete">Athlete</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    // Non-admins see read-only role badge
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        formData.role === 'admin' 
                          ? 'bg-red-100 text-red-800'
                          : formData.role === 'coach'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {formData.role === 'admin' ? '🛡️ Admin' : 
                         formData.role === 'coach' ? '👨‍🏫 Coach' : 
                         '🏃‍♂️ Athlete'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Contact an administrator to change your role
                      </p>
                    </div>
                  )}
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

        {/* Gallery Section - Only show for coaches */}
        {profile?.role === 'coach' && (
          <div className="mt-8">
            <CoachGallery coachId={profile.id} />
          </div>
        )}
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