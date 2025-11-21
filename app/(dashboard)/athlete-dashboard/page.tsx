'use client';

import { useEffect, useState } from 'react';
import ReviewForm from '@/components/ReviewForm';

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
  coach: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  listing: {
    title: string;
    duration_minutes: number;
    description: string | null;
  } | null;
  hasReview?: boolean;
}

export default function AthleteDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!email) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/athlete-bookings?email=${encodeURIComponent(email)}`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Athlete Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            View your scheduled coaching sessions
          </p>
        </div>

        {/* Email Input */}
        <div className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Find Your Bookings
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Enter the email address you used when booking sessions
            </p>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Find Bookings'}
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading bookings
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookings List */}
        {email && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Your Scheduled Sessions
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Upcoming and past coaching sessions for {email}
              </p>
            </div>
            
            {loading ? (
              <div className="px-4 py-5 sm:px-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border-b border-gray-200 pb-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="px-4 py-5 sm:px-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No coaching sessions found for this email address.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <div key={booking.id} className="px-4 py-6 sm:px-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {booking.coach?.avatar_url && (
                          <img
                            className="h-12 w-12 rounded-full object-cover"
                            src={booking.coach.avatar_url}
                            alt={booking.coach.full_name || 'Coach'}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {booking.listing?.title || 'Coaching Session'}
                          </div>
                          <div className="text-sm text-gray-500 mb-1">
                            with {booking.coach?.full_name || 'Coach'}
                          </div>
                          {booking.listing?.description && (
                            <div className="text-sm text-gray-500 mb-2">
                              {booking.listing.description}
                            </div>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>📅 {formatDate(booking.starts_at)}</span>
                            <span>⏱️ {booking.listing?.duration_minutes || 60} min</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                        <div className="text-lg font-medium text-gray-900">
                          {formatCurrency(booking.amount_paid_cents)}
                        </div>
                        {/* Show Leave Review button for completed live lessons without a review */}
                        {booking.status === 'completed' &&
                         (!booking.booking_type || booking.booking_type === 'live_lesson') &&
                         !booking.hasReview && (
                          <button
                            onClick={() => setReviewingBookingId(booking.id)}
                            className="bg-ttOrange hover:bg-ttOrange/90 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                          >
                            Leave Review
                          </button>
                        )}
                        {booking.hasReview && (
                          <span className="text-xs text-gray-500 italic">Review submitted</span>
                        )}
                      </div>
                    </div>

                    {/* Review Form */}
                    {reviewingBookingId === booking.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <ReviewForm
                          bookingId={booking.id}
                          coachName={booking.coach?.full_name || 'Coach'}
                          onSuccess={() => {
                            setReviewingBookingId(null);
                            // Mark this booking as reviewed
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
            )}
          </div>
        )}
        
        {/* Test Section */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-green-900 mb-4">
            Book a Test Session
          </h3>
          <p className="text-sm text-green-700 mb-4">
            Try booking a coaching session to see how the system works
          </p>
          <a
            href="/test-booking"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-sm"
          >
            Book Test Session
          </a>
        </div>
      </div>
    </div>
  );
}