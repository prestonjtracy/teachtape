'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';
import ReviewForm from '@/components/ReviewForm';
import FilmReviewDisplay from '@/components/FilmReviewDisplay';

interface ReviewContent {
  overallAssessment: string;
  strengths: string;
  areasForImprovement: string;
  recommendedDrills: string;
  keyTimestamps?: string | null;
  supplementalDocUrl?: string | null;
}

interface Booking {
  id: string;
  listing_id: string;
  customer_email: string | null;
  amount_paid_cents: number;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  booking_type?: 'live_lesson' | 'film_review' | null;
  review_status?: string | null;
  review_content?: ReviewContent | null;
  review_document_url?: string | null;
  review_completed_at?: string | null;
  film_url?: string | null;
  athlete_notes?: string | null;
  coach: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  listing: {
    title: string;
    duration_minutes: number;
    description: string | null;
    turnaround_hours?: number | null;
  } | null;
  hasReview?: boolean;
}

export default function AthleteDashboard() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);
  const [expandedFilmReview, setExpandedFilmReview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'reviews'>('overview');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/athlete-bookings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Separate film reviews from live lessons
  const filmReviews = bookings.filter(b => b.booking_type === 'film_review');
  const liveLessons = bookings.filter(b => !b.booking_type || b.booking_type === 'live_lesson');

  // Get upcoming sessions (future sessions, sorted by date)
  const upcomingSessions = liveLessons
    .filter(b => b.starts_at && new Date(b.starts_at) > new Date())
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())
    .slice(0, 3);

  // Calculate stats
  const totalSessions = liveLessons.length;
  const completedSessions = liveLessons.filter(b => b.status === 'completed').length;
  const totalHoursCoached = liveLessons.reduce((acc, b) => acc + (b.listing?.duration_minutes || 0), 0) / 60;
  const completedReviews = filmReviews.filter(b => b.review_status === 'completed').length;
  const pendingReviews = filmReviews.filter(b => b.review_status === 'accepted' || b.review_status === 'pending_acceptance').length;

  // Recent activity (last 5 items)
  const recentActivity = [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getFilmReviewStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'pending_acceptance':
        return { label: 'Pending Approval', bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' };
      case 'accepted':
        return { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' };
      case 'completed':
        return { label: 'Completed', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' };
      case 'declined':
        return { label: 'Declined', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
      default:
        return { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Athlete'}!
              </h1>
              <p className="mt-2 text-blue-100 text-lg">
                Track your progress and manage your coaching sessions
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/coaches"
                className="inline-flex items-center px-6 py-3 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find a Coach
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={fetchBookings} className="text-sm text-red-600 hover:text-red-800 font-medium">
              Try again
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 -mt-16 relative z-10">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Sessions</span>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{totalSessions}</p>
            <p className="text-xs text-gray-500 mt-1">{completedSessions} completed</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Hours Coached</span>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{totalHoursCoached.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">hours of training</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Film Reviews</span>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{completedReviews}</p>
            <p className="text-xs text-gray-500 mt-1">{pendingReviews} in progress</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Upcoming</span>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{upcomingSessions.length}</p>
            <p className="text-xs text-gray-500 mt-1">scheduled sessions</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/coaches"
            className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#F45A14]/30 transition-all flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#F45A14] to-[#FF8A4C] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-[#F45A14] transition-colors">Browse Coaches</span>
          </Link>

          <Link
            href="/messages"
            className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#123C7A]/30 transition-all flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.476L3 21l1.476-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-[#123C7A] transition-colors">Messages</span>
          </Link>

          <Link
            href="/my-profile"
            className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-500/30 transition-all flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">My Profile</span>
          </Link>

          <Link
            href="/dashboard"
            className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-500/30 transition-all flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">Dashboard</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Sessions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#123C7A] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upcoming Sessions
                </h2>
                {liveLessons.length > 0 && (
                  <button
                    onClick={() => setActiveTab('sessions')}
                    className="text-sm text-[#F45A14] hover:text-[#E04D0B] font-medium"
                  >
                    View all
                  </button>
                )}
              </div>
              <div className="p-6">
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-gray-900 font-medium mb-1">No upcoming sessions</h3>
                    <p className="text-gray-500 text-sm mb-4">Book a session with a coach to get started</p>
                    <Link
                      href="/coaches"
                      className="inline-flex items-center px-4 py-2 bg-[#F45A14] hover:bg-[#E04D0B] text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Find a Coach
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-shrink-0 mr-4">
                          {session.coach?.avatar_url ? (
                            <img
                              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                              src={session.coach.avatar_url}
                              alt={session.coach.full_name || 'Coach'}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center ring-2 ring-white shadow-sm">
                              <span className="text-white text-lg font-semibold">
                                {session.coach?.full_name?.charAt(0) || 'C'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {session.listing?.title || 'Coaching Session'}
                          </p>
                          <p className="text-sm text-gray-500">
                            with {session.coach?.full_name || 'Coach'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#123C7A]">
                            {formatDate(session.starts_at)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {session.listing?.duration_minutes || 60} min
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Film Reviews Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#123C7A] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Film Reviews ({filmReviews.length})
                </h2>
              </div>
              <div className="p-6">
                {filmReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-gray-900 font-medium mb-1">No film reviews yet</h3>
                    <p className="text-gray-500 text-sm">Request a film review from a coach</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filmReviews.slice(0, 3).map((booking) => {
                      const status = getFilmReviewStatusBadge(booking.review_status);
                      const isExpanded = expandedFilmReview === booking.id;

                      return (
                        <div key={booking.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="p-4 bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                {booking.coach?.avatar_url ? (
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={booking.coach.avatar_url}
                                    alt={booking.coach.full_name || 'Coach'}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center">
                                    <span className="text-white font-semibold">
                                      {booking.coach?.full_name?.charAt(0) || 'C'}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {booking.listing?.title || 'Film Review'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {booking.coach?.full_name} • {formatShortDate(booking.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1.5`}></span>
                                  {status.label}
                                </span>
                              </div>
                            </div>

                            {booking.review_status === 'completed' && (
                              <div className="mt-3">
                                <button
                                  onClick={() => setExpandedFilmReview(isExpanded ? null : booking.id)}
                                  className="inline-flex items-center px-3 py-1.5 bg-[#F45A14] text-white text-sm font-medium rounded-lg hover:bg-[#E04D0B] transition-colors"
                                >
                                  <svg className={`w-4 h-4 mr-1.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  {isExpanded ? 'Hide Review' : 'View Review'}
                                </button>
                              </div>
                            )}
                          </div>

                          {isExpanded && booking.review_status === 'completed' && (
                            <div className="p-4 bg-white border-t border-gray-200">
                              <FilmReviewDisplay
                                reviewContent={booking.review_content || null}
                                coachName={booking.coach?.full_name || 'Coach'}
                                completedAt={booking.review_completed_at || undefined}
                                supplementalDocUrl={booking.review_document_url}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-[#123C7A] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Activity
                </h2>
              </div>
              <div className="p-4">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((item) => {
                      const isFilmReview = item.booking_type === 'film_review';
                      const status = isFilmReview ? getFilmReviewStatusBadge(item.review_status) : null;

                      return (
                        <div key={item.id} className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            isFilmReview ? 'bg-orange-100' : 'bg-blue-100'
                          }`}>
                            {isFilmReview ? (
                              <svg className="w-4 h-4 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.listing?.title || (isFilmReview ? 'Film Review' : 'Session')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.coach?.full_name} • {formatShortDate(item.created_at)}
                            </p>
                            {status && (
                              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.text}`}>
                                {status.label}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-[#F45A14]">
                              {formatCurrency(item.amount_paid_cents)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] rounded-xl p-6 text-white">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 text-yellow-300 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="font-semibold">Pro Tip</h3>
              </div>
              <p className="text-blue-100 text-sm">
                Get the most out of your film reviews by providing clear timestamps and specific questions for your coach.
              </p>
            </div>
          </div>
        </div>

        {/* All Sessions Section (condensed) */}
        {liveLessons.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#123C7A] flex items-center">
                <svg className="w-5 h-5 mr-2 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                All Sessions ({liveLessons.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {liveLessons.map((booking) => (
                <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {booking.coach?.avatar_url ? (
                        <img
                          className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100"
                          src={booking.coach.avatar_url}
                          alt={booking.coach.full_name || 'Coach'}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center ring-2 ring-gray-100">
                          <span className="text-white text-lg font-semibold">
                            {booking.coach?.full_name?.charAt(0) || 'C'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-medium text-gray-900">
                          {booking.listing?.title || 'Coaching Session'}
                        </p>
                        <p className="text-sm text-gray-500">
                          with {booking.coach?.full_name || 'Coach'}
                        </p>
                        <div className="flex items-center flex-wrap gap-3 mt-2 text-sm text-gray-500">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(booking.starts_at)}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {booking.listing?.duration_minutes || 60} min
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.status === 'paid' ? 'bg-green-100 text-green-800' :
                            booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-lg font-bold text-[#F45A14]">
                        {formatCurrency(booking.amount_paid_cents)}
                      </span>
                      {booking.status === 'completed' && !booking.hasReview && (
                        <button
                          onClick={() => setReviewingBookingId(booking.id)}
                          className="px-4 py-2 bg-[#F45A14] hover:bg-[#E04D0B] text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Leave Review
                        </button>
                      )}
                      {booking.hasReview && (
                        <span className="text-xs text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Review submitted
                        </span>
                      )}
                    </div>
                  </div>

                  {reviewingBookingId === booking.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <ReviewForm
                        bookingId={booking.id}
                        coachName={booking.coach?.full_name || 'Coach'}
                        onSuccess={() => {
                          setReviewingBookingId(null);
                          setBookings(prev => prev.map(b =>
                            b.id === booking.id ? { ...b, hasReview: true } : b
                          ));
                        }}
                        onCancel={() => setReviewingBookingId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
