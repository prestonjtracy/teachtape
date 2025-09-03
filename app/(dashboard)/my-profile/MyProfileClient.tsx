'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();
        
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
    }
    loadUser();
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ttOrange"></div>
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