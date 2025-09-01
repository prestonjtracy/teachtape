'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Toast from '@/components/Toast';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  bio: string;
  sport: string;
  avatar_url: string;
}

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
    return <div>Loading...</div>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 600 }}>
      <h1>My Profile</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Full Name</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="coach">Coach</option>
            <option value="athlete">Athlete</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            rows={4}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Sport</label>
          <input
            type="text"
            value={formData.sport}
            onChange={(e) => setFormData(prev => ({ ...prev, sport: e.target.value }))}
            style={{ width: '100%', padding: 8 }}
            placeholder="e.g. Basketball, Tennis, Soccer"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Avatar URL</label>
          <input
            type="url"
            value={formData.avatar_url}
            onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
            style={{ width: '100%', padding: 8 }}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
        </button>
      </form>

      {profile && (
        <div style={{ marginTop: 32, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
          <h3>Current Profile</h3>
          <p><strong>Name:</strong> {profile.full_name}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Sport:</strong> {profile.sport}</p>
          <p><strong>Bio:</strong> {profile.bio}</p>
          {profile.avatar_url && (
            <div>
              <strong>Avatar:</strong><br />
              <img src={profile.avatar_url} alt="Avatar" style={{ maxWidth: 100, maxHeight: 100 }} />
            </div>
          )}
        </div>
      )}
      
      <Toast 
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </main>
  );
}