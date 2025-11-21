'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Toast from '@/components/Toast';
import ListingImageUploader from '@/components/ListingImageUploader';

interface Listing {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
  image_url?: string;
  created_at: string;
  listing_type?: 'live_lesson' | 'film_review';
  turnaround_hours?: number;
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
    image_url: '',
    is_active: true,
    listing_type: 'live_lesson' as 'live_lesson' | 'film_review',
    turnaround_hours: '48'
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
            is_active: formData.is_active,
            listing_type: formData.listing_type,
            turnaround_hours: formData.listing_type === 'film_review'
              ? parseInt(formData.turnaround_hours)
              : null
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
            is_active: formData.is_active,
            listing_type: formData.listing_type,
            turnaround_hours: formData.listing_type === 'film_review'
              ? parseInt(formData.turnaround_hours)
              : null
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
        image_url: '',
        is_active: true,
        listing_type: 'live_lesson',
        turnaround_hours: '48'
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
      image_url: listing.image_url || '',
      is_active: listing.is_active,
      listing_type: listing.listing_type || 'live_lesson',
      turnaround_hours: (listing.turnaround_hours || 48).toString()
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
      image_url: '',
      is_active: true,
      listing_type: 'live_lesson',
      turnaround_hours: '48'
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
    <main className="min-h-screen bg-background-subtle">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ttBlue mb-2">My Listings</h1>
              <p className="text-lg text-neutral-text-secondary">Manage your coaching services and sessions</p>
            </div>
            <button 
              onClick={() => showForm ? handleCancelEdit() : setShowForm(true)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                showForm 
                  ? 'bg-gray-500 text-white hover:bg-gray-600' 
                  : 'bg-ttOrange text-white hover:bg-ttOrange/90 shadow-md hover:shadow-lg'
              }`}
            >
              {showForm ? 'Cancel' : '+ New Listing'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-ttBlue">
                {editingListing ? 'Edit Listing' : 'Create New Listing'}
              </h2>
              <p className="text-neutral-text-secondary mt-2">
                {editingListing ? 'Update your coaching service details' : 'Add a new coaching service to your offerings'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-text mb-2">
                  Listing Type *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, listing_type: 'live_lesson' }))}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      formData.listing_type === 'live_lesson'
                        ? 'border-ttOrange bg-ttOrange/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-6 h-6 text-ttOrange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="font-semibold text-neutral-text">Live Lesson</span>
                    </div>
                    <p className="text-sm text-neutral-text-secondary">
                      Real-time video coaching session via Zoom
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, listing_type: 'film_review' }))}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      formData.listing_type === 'film_review'
                        ? 'border-ttOrange bg-ttOrange/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-6 h-6 text-ttOrange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m10 2V2M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM7 8h10M7 12h10M7 16h4" />
                      </svg>
                      <span className="font-semibold text-neutral-text">Film Review</span>
                    </div>
                    <p className="text-sm text-neutral-text-secondary">
                      Written analysis of athlete's video footage
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-text mb-2">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ttOrange focus:border-ttOrange transition-colors"
                  placeholder={formData.listing_type === 'film_review' ? 'e.g. Game Film Analysis' : 'e.g. Basketball Training Session'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-text mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ttOrange focus:border-ttOrange transition-colors resize-none"
                  placeholder="Describe what you'll teach, your experience, and what clients can expect..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-text mb-2">
                    Price (cents) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={formData.price_cents}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_cents: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ttOrange focus:border-ttOrange transition-colors"
                      placeholder="5000"
                    />
                    <span className="absolute right-4 top-3 text-sm text-neutral-text-muted">
                      = ${formData.price_cents ? (parseInt(formData.price_cents) / 100).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                {formData.listing_type === 'live_lesson' ? (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-text mb-2">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ttOrange focus:border-ttOrange transition-colors"
                      placeholder="60"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-text mb-2">
                      Turnaround Time (hours) *
                    </label>
                    <select
                      value={formData.turnaround_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, turnaround_hours: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ttOrange focus:border-ttOrange transition-colors"
                    >
                      <option value="24">24 hours</option>
                      <option value="48">48 hours (standard)</option>
                      <option value="72">72 hours</option>
                      <option value="96">96 hours (4 days)</option>
                      <option value="168">168 hours (1 week)</option>
                    </select>
                    <p className="mt-1 text-xs text-neutral-text-muted">
                      Time you have to deliver the review after accepting the request
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-text mb-2">
                  Listing Image
                </label>
                <ListingImageUploader
                  value={formData.image_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  listingId={editingListing?.id}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-5 w-5 text-ttOrange border-gray-300 rounded focus:ring-ttOrange"
                />
                <label htmlFor="is_active" className="ml-3 text-sm font-medium text-neutral-text">
                  Active (visible to clients)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-ttOrange text-white px-6 py-3 rounded-lg font-semibold hover:bg-ttOrange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {loading ? (editingListing ? 'Updating...' : 'Creating...') : (editingListing ? 'Update Listing' : 'Create Listing')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 border border-gray-300 text-neutral-text rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {listings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-24 h-24 mx-auto mb-6 bg-ttOrange/10 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-ttOrange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-text mb-2">No listings yet</h3>
            <p className="text-neutral-text-secondary mb-6">Create your first coaching service to get started</p>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-ttOrange text-white px-6 py-3 rounded-lg font-semibold hover:bg-ttOrange/90 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              + Create Your First Listing
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {listings.map(listing => (
              <div 
                key={listing.id} 
                className={`bg-white rounded-xl shadow-md border transition-all duration-200 hover:shadow-lg ${
                  listing.is_active 
                    ? 'border-gray-200' 
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-ttBlue truncate">{listing.title}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          listing.listing_type === 'film_review'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {listing.listing_type === 'film_review' ? 'Film Review' : 'Live Lesson'}
                        </span>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          listing.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {listing.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {listing.description && (
                        <p className="text-neutral-text-secondary mb-4 line-clamp-2">
                          {listing.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-ttOrange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <span className="font-semibold text-ttBlue">
                            ${(listing.price_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-ttOrange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-neutral-text">
                            {listing.listing_type === 'film_review'
                              ? `${listing.turnaround_hours || 48}hr turnaround`
                              : `${listing.duration_minutes} minutes`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row lg:flex-col gap-2 lg:min-w-0">
                      <button 
                        onClick={() => handleEdit(listing)}
                        className="flex-1 lg:flex-none bg-ttOrange text-white px-4 py-2 rounded-lg font-medium hover:bg-ttOrange/90 transition-all duration-200 text-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => toggleActive(listing.id, listing.is_active)}
                        className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                          listing.is_active
                            ? 'bg-gray-500 text-white hover:bg-gray-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {listing.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button 
                        onClick={() => handleDelete(listing.id)}
                        className="flex-1 lg:flex-none bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200 text-sm"
                      >
                        Delete
                      </button>
                    </div>
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