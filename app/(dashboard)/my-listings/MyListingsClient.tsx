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

interface ListingStats {
  listing_id: string;
  total_bookings: number;
  total_revenue: number;
  pending_requests: number;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function MyListingsClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingStats, setListingStats] = useState<Map<string, ListingStats>>(new Map());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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

          // Get booking stats for each listing
          if (listings && listings.length > 0) {
            const statsMap = new Map<string, ListingStats>();

            for (const listing of listings) {
              const { data: bookings } = await supabase
                .from('bookings')
                .select('amount_paid_cents, status')
                .eq('listing_id', listing.id);

              const { count: pendingCount } = await supabase
                .from('booking_requests')
                .select('*', { count: 'exact', head: true })
                .eq('listing_id', listing.id)
                .eq('status', 'pending');

              const paidBookings = bookings?.filter(b => b.status === 'paid' || b.status === 'completed') || [];

              statsMap.set(listing.id, {
                listing_id: listing.id,
                total_bookings: paidBookings.length,
                total_revenue: paidBookings.reduce((sum, b) => sum + b.amount_paid_cents, 0),
                pending_requests: pendingCount || 0
              });
            }

            setListingStats(statsMap);
          }
        }
      }
      setInitialLoading(false);
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

    setToast({ show: true, message: `Listing ${!currentActive ? 'activated' : 'paused'} successfully!`, type: 'success' });

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
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;

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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  // Calculate summary stats
  const activeListings = listings.filter(l => l.is_active).length;
  const totalRevenue = Array.from(listingStats.values()).reduce((sum, s) => sum + s.total_revenue, 0);
  const totalBookings = Array.from(listingStats.values()).reduce((sum, s) => sum + s.total_bookings, 0);
  const pendingRequests = Array.from(listingStats.values()).reduce((sum, s) => sum + s.pending_requests, 0);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F45A14] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your listings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view your listings.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile First</h2>
          <p className="text-gray-600 mb-6">You need to set up your coach profile before creating listings.</p>
          <a
            href="/my-profile"
            className="inline-flex items-center px-6 py-3 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-xl transition-colors"
          >
            Set Up Profile
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">My Listings</h1>
              <p className="mt-2 text-blue-100 text-lg">
                Manage your coaching services and track performance
              </p>
            </div>
            <button
              onClick={() => showForm ? handleCancelEdit() : setShowForm(true)}
              className={`mt-4 md:mt-0 inline-flex items-center px-6 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                showForm
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  : 'bg-[#F45A14] hover:bg-[#E04D0B] text-white hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              {showForm ? (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Listing
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 -mt-16 relative z-10">
          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Active Listings</span>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{activeListings}</p>
            <p className="text-xs text-gray-500 mt-1">of {listings.length} total</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Revenue</span>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">all time earnings</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Bookings</span>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{totalBookings}</p>
            <p className="text-xs text-gray-500 mt-1">completed sessions</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Pending</span>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{pendingRequests}</p>
            <p className="text-xs text-gray-500 mt-1">awaiting response</p>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-2xl font-bold text-[#123C7A]">
                {editingListing ? 'Edit Listing' : 'Create New Listing'}
              </h2>
              <p className="text-gray-600 mt-1">
                {editingListing ? 'Update your coaching service details' : 'Add a new coaching service to your offerings'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Service Type *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, listing_type: 'live_lesson' }))}
                    className={`p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                      formData.listing_type === 'live_lesson'
                        ? 'border-[#F45A14] bg-orange-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.listing_type === 'live_lesson' ? 'bg-[#F45A14]' : 'bg-gray-200'
                      }`}>
                        <svg className={`w-5 h-5 ${formData.listing_type === 'live_lesson' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-900">Live Lesson</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Real-time video coaching session via Zoom
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, listing_type: 'film_review' }))}
                    className={`p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                      formData.listing_type === 'film_review'
                        ? 'border-purple-500 bg-purple-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.listing_type === 'film_review' ? 'bg-purple-500' : 'bg-gray-200'
                      }`}>
                        <svg className={`w-5 h-5 ${formData.listing_type === 'film_review' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m10 2V2M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM7 8h10M7 12h10M7 16h4" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-900">Film Review</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Detailed analysis of athlete's video footage
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F45A14] focus:border-[#F45A14] transition-colors"
                  placeholder={formData.listing_type === 'film_review' ? 'e.g. Game Film Analysis' : 'e.g. Basketball Training Session'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F45A14] focus:border-[#F45A14] transition-colors resize-none"
                  placeholder="Describe what you'll teach, your experience, and what clients can expect..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-500 font-medium">$</span>
                    <input
                      type="number"
                      required
                      value={formData.price_cents ? (parseInt(formData.price_cents) / 100).toString() : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_cents: (parseFloat(e.target.value) * 100).toString() }))}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F45A14] focus:border-[#F45A14] transition-colors"
                      placeholder="50"
                      step="0.01"
                    />
                  </div>
                </div>

                {formData.listing_type === 'live_lesson' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration (minutes) *
                    </label>
                    <select
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F45A14] focus:border-[#F45A14] transition-colors"
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                      <option value="120">120 minutes</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Turnaround Time *
                    </label>
                    <select
                      value={formData.turnaround_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, turnaround_hours: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F45A14] focus:border-[#F45A14] transition-colors"
                    >
                      <option value="24">24 hours</option>
                      <option value="48">48 hours (standard)</option>
                      <option value="72">72 hours</option>
                      <option value="96">4 days</option>
                      <option value="168">1 week</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Listing Image
                </label>
                <ListingImageUploader
                  value={formData.image_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  listingId={editingListing?.id}
                />
              </div>

              <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-5 w-5 text-[#F45A14] border-gray-300 rounded focus:ring-[#F45A14]"
                />
                <label htmlFor="is_active" className="ml-3">
                  <span className="text-sm font-medium text-gray-900">Make listing active</span>
                  <p className="text-xs text-gray-500">Active listings are visible to athletes and can receive bookings</p>
                </label>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#F45A14] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#E04D0B] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingListing ? 'Saving...' : 'Creating...'}
                    </span>
                  ) : (
                    editingListing ? 'Save Changes' : 'Create Listing'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="text-center py-16 px-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#F45A14] to-[#FF8A4C] rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Listing</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start earning by creating coaching services. Athletes are looking for coaches like you!
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-8 py-4 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Listing
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {listings.map(listing => {
              const stats = listingStats.get(listing.id);

              return (
                <div
                  key={listing.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md ${
                    listing.is_active
                      ? 'border-gray-100 hover:border-green-200'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  {/* Status indicator bar */}
                  <div className={`h-1 ${listing.is_active ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gray-300'}`} />

                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          {/* Service Type Badge */}
                          <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg ${
                            listing.listing_type === 'film_review'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-[#123C7A]'
                          }`}>
                            {listing.listing_type === 'film_review' ? (
                              <>
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m10 2V2M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM7 8h10" />
                                </svg>
                                Film Review
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Live Lesson
                              </>
                            )}
                          </span>

                          {/* Status Badge */}
                          <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg ${
                            listing.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${listing.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {listing.is_active ? 'Active' : 'Paused'}
                          </span>

                          {/* Pending requests badge */}
                          {stats && stats.pending_requests > 0 && (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-100 text-yellow-700">
                              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              {stats.pending_requests} pending
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-[#123C7A] mb-2">{listing.title}</h3>

                        {listing.description && (
                          <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                            {listing.description}
                          </p>
                        )}

                        {/* Price and Duration */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg">
                            <svg className="w-4 h-4 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span className="font-bold text-[#F45A14]">
                              {formatCurrency(listing.price_cents)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                              {listing.listing_type === 'film_review'
                                ? `${listing.turnaround_hours || 48}hr turnaround`
                                : `${listing.duration_minutes} min session`
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Section */}
                      <div className="flex lg:flex-col gap-4 lg:gap-3 lg:min-w-[160px] lg:border-l lg:border-gray-100 lg:pl-6">
                        <div className="flex-1 lg:flex-none bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-[#123C7A]">{stats?.total_bookings || 0}</p>
                          <p className="text-xs text-gray-500">Bookings</p>
                        </div>
                        <div className="flex-1 lg:flex-none bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.total_revenue || 0)}</p>
                          <p className="text-xs text-gray-500">Revenue</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleEdit(listing)}
                        className="inline-flex items-center px-4 py-2 bg-[#123C7A] hover:bg-[#0F3166] text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(listing.id, listing.is_active)}
                        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          listing.is_active
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                      >
                        {listing.is_active ? (
                          <>
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pause
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Activate
                          </>
                        )}
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pro Tip */}
        {listings.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Pro Tip: Optimize Your Listings</h3>
                <p className="text-blue-100 text-sm">
                  Listings with detailed descriptions and competitive pricing get 40% more bookings. Consider adding images and highlighting your unique coaching style!
                </p>
              </div>
            </div>
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
