'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Toast from '@/components/Toast';

interface Listing {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function MyListingsClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_cents: '',
    duration_minutes: '60',
    is_active: true
  });
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('auth_user_id', user.id)
          .single();
        
        setProfile(profile);
        
        if (profile) {
          // Get user's listings
          const { data: listings } = await supabase
            .from('listings')
            .select('*')
            .eq('coach_id', profile.id)
            .order('created_at', { ascending: false });
          
          setListings(listings || []);
        }
      }
    }
    loadData();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      if (editingListing) {
        // Update existing listing
        const { error } = await supabase
          .from('listings')
          .update({
            title: formData.title,
            description: formData.description,
            price_cents: parseInt(formData.price_cents),
            duration_minutes: parseInt(formData.duration_minutes),
            is_active: formData.is_active
          })
          .eq('id', editingListing.id);
        
        if (error) throw error;
        setToast({ show: true, message: 'Listing updated successfully!', type: 'success' });
      } else {
        // Create new listing
        const { error } = await supabase
          .from('listings')
          .insert({
            coach_id: profile.id,
            title: formData.title,
            description: formData.description,
            price_cents: parseInt(formData.price_cents),
            duration_minutes: parseInt(formData.duration_minutes),
            is_active: formData.is_active
          });
        
        if (error) throw error;
        setToast({ show: true, message: 'Listing created successfully!', type: 'success' });
      }
      
      setShowForm(false);
      setEditingListing(null);
      setFormData({
        title: '',
        description: '',
        price_cents: '',
        duration_minutes: '60',
        is_active: true
      });
      
      // Reload listings
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('coach_id', profile.id)
        .order('created_at', { ascending: false });
      
      setListings(listings || []);
    } catch (error: any) {
      setToast({ show: true, message: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(listingId: string, currentActive: boolean) {
    const { error } = await supabase
      .from('listings')
      .update({ is_active: !currentActive })
      .eq('id', listingId);
    
    if (error) {
      setToast({ show: true, message: `Error: ${error.message}`, type: 'error' });
      return;
    }
    
    setToast({ show: true, message: `Listing ${!currentActive ? 'activated' : 'deactivated'} successfully!`, type: 'success' });
    
    setListings(prev => prev.map(listing => 
      listing.id === listingId 
        ? { ...listing, is_active: !currentActive }
        : listing
    ));
  }

  function handleEdit(listing: Listing) {
    setEditingListing(listing);
    setFormData({
      title: listing.title,
      description: listing.description || '',
      price_cents: listing.price_cents.toString(),
      duration_minutes: listing.duration_minutes.toString(),
      is_active: listing.is_active
    });
    setShowForm(true);
  }

  async function handleDelete(listingId: string) {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId);
    
    if (error) {
      setToast({ show: true, message: `Error: ${error.message}`, type: 'error' });
      return;
    }
    
    setToast({ show: true, message: 'Listing deleted successfully!', type: 'success' });
    setListings(prev => prev.filter(listing => listing.id !== listingId));
  }

  function handleCancelEdit() {
    setShowForm(false);
    setEditingListing(null);
    setFormData({
      title: '',
      description: '',
      price_cents: '',
      duration_minutes: '60',
      is_active: true
    });
  }

  if (!user) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!profile) {
    return (
      <div style={{ padding: 24 }}>
        <p>Please create your profile first.</p>
        <a href="/my-profile" style={{ color: '#007bff' }}>Go to My Profile</a>
      </div>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>My Listings</h1>
        <button 
          onClick={() => showForm ? handleCancelEdit() : setShowForm(true)}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4 
          }}
        >
          {showForm ? 'Cancel' : 'New Listing'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ 
          marginBottom: 32, 
          padding: 24, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8,
          display: 'flex', 
          flexDirection: 'column', 
          gap: 16,
          maxWidth: 600
        }}>
          <h2>{editingListing ? 'Edit Listing' : 'Create New Listing'}</h2>
          
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: '100%', padding: 8 }}
              placeholder="e.g. Basketball Training Session"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: 8 }}
              placeholder="Describe what you'll teach..."
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Price (cents) *</label>
              <input
                type="number"
                required
                value={formData.price_cents}
                onChange={(e) => setFormData(prev => ({ ...prev, price_cents: e.target.value }))}
                style={{ width: '100%', padding: 8 }}
                placeholder="5000 = $50.00"
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Duration (minutes) *</label>
              <input
                type="number"
                required
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                style={{ width: '100%', padding: 8 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              Active (visible to customers)
            </label>
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
{loading ? (editingListing ? 'Updating...' : 'Creating...') : (editingListing ? 'Update Listing' : 'Create Listing')}
          </button>
        </form>
      )}

      <div>
        {listings.length === 0 ? (
          <p>No listings yet. Create your first listing above!</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {listings.map(listing => (
              <div 
                key={listing.id} 
                style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: 8, 
                  padding: 16,
                  backgroundColor: listing.is_active ? 'white' : '#f8f9fa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>{listing.title}</h3>
                    {listing.description && <p style={{ margin: '0 0 8px 0', color: '#666' }}>{listing.description}</p>}
                    <div style={{ display: 'flex', gap: 16, fontSize: 14, color: '#666' }}>
                      <span>${(listing.price_cents / 100).toFixed(2)}</span>
                      <span>{listing.duration_minutes} mins</span>
                      <span className={listing.is_active ? 'text-green-600' : 'text-gray-500'}>
                        {listing.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => handleEdit(listing)}
                      style={{ 
                        padding: '4px 12px', 
                        backgroundColor: '#007bff',
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4,
                        fontSize: 12
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => toggleActive(listing.id, listing.is_active)}
                      style={{ 
                        padding: '4px 12px', 
                        backgroundColor: listing.is_active ? '#dc3545' : '#28a745',
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4,
                        fontSize: 12
                      }}
                    >
                      {listing.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleDelete(listing.id)}
                      style={{ 
                        padding: '4px 12px', 
                        backgroundColor: '#dc3545',
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4,
                        fontSize: 12
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
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