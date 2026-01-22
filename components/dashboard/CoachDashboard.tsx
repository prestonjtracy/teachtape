'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import BookingRequestsList from "@/components/dashboard/BookingRequestsList";

interface Booking {
  id: string;
  created_at: string;
  customer_email: string | null;
  amount_paid_cents: number;
  status: string;
  listing_id: string;
  stripe_session_id: string;
  starts_at?: string | null;
  ends_at?: string | null;
  conversation_id?: string | null;
  listing?: {
    title: string;
    duration_minutes?: number;
  };
}

interface EarningsSummary {
  last7Days: number;
  monthToDate: number;
  allTime: number;
}

interface StripeAccountStatus {
  accountId: string | null;
  chargesEnabled: boolean;
  needsOnboarding: boolean;
}

interface Coach {
  id: string;
  profile_id: string;
  full_name: string | null;
}

interface CoachDashboardProps {
  coach: Coach;
  bookings: Booking[];
  earningsSummary: EarningsSummary;
  stripeAccountStatus: StripeAccountStatus;
}

export default function CoachDashboard({
  coach,
  bookings = [],
  earningsSummary,
  stripeAccountStatus
}: CoachDashboardProps) {
  const router = useRouter();
  const [loadingConversation, setLoadingConversation] = useState<string | null>(null);
  const [localBookings, setLocalBookings] = useState<Booking[]>(bookings);
  const [coachStats, setCoachStats] = useState<{
    averageRating: number;
    totalReviews: number;
    totalStudents: number;
  } | null>(null);

  // Keep localBookings in sync with props
  useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    // Fetch additional coach stats
    async function fetchCoachStats() {
      try {
        const response = await fetch(`/api/reviews/${coach.profile_id}`);
        if (response.ok) {
          const data = await response.json();
          setCoachStats({
            averageRating: data.averageRating || 0,
            totalReviews: data.reviews?.length || 0,
            totalStudents: new Set(bookings.map(b => b.customer_email)).size
          });
        }
      } catch (error) {
        console.error('Error fetching coach stats:', error);
      }
    }
    fetchCoachStats();
  }, [coach.profile_id, bookings]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleViewSession = async (booking: Booking) => {
    // If conversation already exists, navigate directly
    if (booking.conversation_id) {
      router.push(`/messages/${booking.conversation_id}`);
      return;
    }

    // Otherwise, create a conversation first
    setLoadingConversation(booking.id);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/conversation`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok && data.conversation_id) {
        // Update local state with the new conversation_id
        setLocalBookings(prev => prev.map(b =>
          b.id === booking.id ? { ...b, conversation_id: data.conversation_id } : b
        ));
        router.push(`/messages/${data.conversation_id}`);
      } else {
        alert(data.message || data.error || 'Failed to create conversation');
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
      alert('Failed to start session chat. Please try again.');
    } finally {
      setLoadingConversation(null);
    }
  };

  // Calculate metrics
  const paidBookings = bookings.filter(b => b.status === 'paid');
  const totalSessions = paidBookings.length;
  const totalHours = paidBookings.reduce((acc, b) => acc + (b.listing?.duration_minutes || 60), 0) / 60;
  const uniqueStudents = new Set(paidBookings.map(b => b.customer_email)).size;

  // Get upcoming sessions (future sessions with starts_at) - use localBookings for conversation_id updates
  const upcomingSessions = localBookings
    .filter(b => b.starts_at && new Date(b.starts_at) > new Date())
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())
    .slice(0, 3);

  // Recent bookings (last 5)
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Calculate earnings trend (compare last 7 days to previous 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const last7DaysEarnings = paidBookings
    .filter(b => new Date(b.created_at) >= sevenDaysAgo)
    .reduce((sum, b) => sum + b.amount_paid_cents, 0);

  const previous7DaysEarnings = paidBookings
    .filter(b => new Date(b.created_at) >= fourteenDaysAgo && new Date(b.created_at) < sevenDaysAgo)
    .reduce((sum, b) => sum + b.amount_paid_cents, 0);

  const earningsTrend = previous7DaysEarnings > 0
    ? ((last7DaysEarnings - previous7DaysEarnings) / previous7DaysEarnings) * 100
    : last7DaysEarnings > 0 ? 100 : 0;

  async function continueOnboarding() {
    try {
      const response = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to get onboarding URL');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Failed to continue onboarding');
    }
  }

  // Simple sparkline component
  const MiniSparkline = ({ data, color }: { data: number[], color: string }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="ml-2">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };

  // Generate last 7 days earnings data for sparkline
  const generateSparklineData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayEarnings = paidBookings
        .filter(b => {
          const bookingDate = new Date(b.created_at);
          return bookingDate >= dayStart && bookingDate <= dayEnd;
        })
        .reduce((sum, b) => sum + b.amount_paid_cents, 0);

      data.push(dayEarnings);
    }
    return data;
  };

  const sparklineData = generateSparklineData();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                {getGreeting()}, {coach.full_name?.split(' ')[0] || 'Coach'}!
              </h1>
              <p className="mt-2 text-blue-100 text-lg">
                Here's how your coaching business is performing
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
              <Link
                href="/my-listings"
                className="inline-flex items-center px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all duration-200 border border-white/20"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Listing
              </Link>
              <Link
                href="/messages"
                className="inline-flex items-center px-5 py-2.5 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.476L3 21l1.476-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
                Messages
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stripe Onboarding Banner */}
        {stripeAccountStatus?.needsOnboarding && (
          <div
            className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm -mt-12 relative z-10"
            data-testid="stripe-onboarding-banner"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-yellow-800">Complete your Stripe setup</p>
                <p className="text-sm text-yellow-700 mt-0.5">
                  Finish connecting your Stripe account to receive payments for your coaching sessions.
                </p>
              </div>
            </div>
            <button
              onClick={continueOnboarding}
              className="flex-shrink-0 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              Continue Setup
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 ${stripeAccountStatus?.needsOnboarding ? '' : '-mt-16'} relative z-10`}>
          {/* Earnings - Last 7 Days */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Last 7 Days</span>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-[#123C7A]">{formatCurrency(earningsSummary.last7Days)}</p>
                <div className="flex items-center mt-1">
                  {earningsTrend !== 0 && (
                    <span className={`text-xs font-medium flex items-center ${earningsTrend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      <svg className={`w-3 h-3 mr-0.5 ${earningsTrend < 0 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      {Math.abs(earningsTrend).toFixed(0)}%
                    </span>
                  )}
                  <span className="text-xs text-gray-500 ml-1">vs last week</span>
                </div>
              </div>
              <MiniSparkline data={sparklineData} color="#22c55e" />
            </div>
          </div>

          {/* Month to Date */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">This Month</span>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{formatCurrency(earningsSummary.monthToDate)}</p>
            <p className="text-xs text-gray-500 mt-1">month to date</p>
          </div>

          {/* Total Sessions */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Sessions</span>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{totalSessions}</p>
            <p className="text-xs text-gray-500 mt-1">{totalHours.toFixed(1)} hours coached</p>
          </div>

          {/* All Time Earnings */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">All Time</span>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#123C7A]">{formatCurrency(earningsSummary.allTime)}</p>
            <p className="text-xs text-gray-500 mt-1">{uniqueStudents} athletes coached</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Link
            href="/dashboard/film-reviews"
            className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-500/30 transition-all flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">Film Reviews</span>
          </Link>

          <Link
            href="/my-listings"
            className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#F45A14]/30 transition-all flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#F45A14] to-[#FF8A4C] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-[#F45A14] transition-colors">Listings</span>
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
            href="/dashboard/profile"
            className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-500/30 transition-all flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">Payments</span>
          </Link>

          <Link
            href="/my-profile"
            className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-cyan-500/30 transition-all flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-cyan-600 transition-colors">Profile</span>
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
                    <p className="text-gray-500 text-sm mb-4">Your calendar is clear. Share your listings to get bookings!</p>
                    <Link
                      href="/my-listings"
                      className="inline-flex items-center px-4 py-2 bg-[#F45A14] hover:bg-[#E04D0B] text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      View Listings
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
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center ring-2 ring-white shadow-sm">
                            <span className="text-white text-lg font-semibold">
                              {session.customer_email?.charAt(0).toUpperCase() || 'A'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {session.listing?.title || 'Coaching Session'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {session.customer_email || 'Athlete'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(session.starts_at!)} • {session.listing?.duration_minutes || 60} min
                          </p>
                        </div>
                        <button
                          onClick={() => handleViewSession(session)}
                          disabled={loadingConversation === session.id}
                          className="flex-shrink-0 ml-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#F45A14] to-[#FF7A3D] hover:from-[#E04D0B] hover:to-[#F45A14] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingConversation === session.id ? (
                            <>
                              <svg className="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              View Session
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-[#123C7A] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Pending Requests
                </h2>
              </div>
              <div className="p-6">
                <BookingRequestsList
                  coachId={coach.id}
                  onRequestUpdate={() => {
                    console.log('Request updated, dashboard notified');
                  }}
                />
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#123C7A] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Recent Bookings
                </h2>
                {bookings.length > 5 && (
                  <span className="text-sm text-gray-500">
                    Showing 5 of {bookings.length}
                  </span>
                )}
              </div>
              <div className="p-6">
                {recentBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-gray-900 font-medium mb-1">No bookings yet</h3>
                    <p className="text-gray-500 text-sm">Share your coach profile to start getting bookings!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {booking.customer_email?.charAt(0).toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {booking.listing?.title || 'Coaching Session'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {booking.customer_email || 'No email'} • {formatShortDate(booking.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'paid' ? 'bg-green-100 text-green-700' :
                            booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status}
                          </span>
                          <span className="font-semibold text-[#F45A14]">
                            {formatCurrency(booking.amount_paid_cents)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Performance Highlights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-[#123C7A] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Performance
                </h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Rating */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Average Rating</p>
                      <p className="text-xs text-gray-500">{coachStats?.totalReviews || 0} reviews</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-[#123C7A]">
                    {coachStats?.averageRating?.toFixed(1) || '0.0'}
                  </span>
                </div>

                {/* Athletes Coached */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Athletes Coached</p>
                      <p className="text-xs text-gray-500">unique athletes</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-[#123C7A]">
                    {uniqueStudents}
                  </span>
                </div>

                {/* Total Hours */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Hours Coached</p>
                      <p className="text-xs text-gray-500">total time</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-[#123C7A]">
                    {totalHours.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] rounded-xl p-6 text-white">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 text-yellow-300 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="font-semibold">Coach Tip</h3>
              </div>
              <p className="text-blue-100 text-sm">
                Respond to booking requests quickly! Coaches who respond within 24 hours get 3x more bookings.
              </p>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-[#123C7A]">Quick Links</h2>
              </div>
              <div className="p-4 space-y-2">
                <Link
                  href={`/coach/${coach.profile_id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">View Public Profile</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/dashboard/availability"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Set Availability</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/help"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Help & Support</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
