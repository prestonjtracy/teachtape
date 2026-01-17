'use client';

import { useEffect, useState } from 'react';
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);
  const [expandedFilmReview, setExpandedFilmReview] = useState<string | null>(null);

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
    return new Date(dateString).toLocaleString();
  };

  // Separate film reviews from live lessons
  const filmReviews = bookings.filter(b => b.booking_type === 'film_review');
  const liveLessons = bookings.filter(b => !b.booking_type || b.booking_type === 'live_lesson');

  const getFilmReviewStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'pending_acceptance':
        return { label: 'Pending Coach Approval', bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'accepted':
        return { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'completed':
        return { label: 'Completed', bg: 'bg-green-100', text: 'text-green-800' };
      case 'declined':
        return { label: 'Declined - Refunded', bg: 'bg-red-100', text: 'text-red-800' };
      default:
        return { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#123C7A]">My Dashboard</h1>
          <p className="mt-2 text-gray-600">
            View your coaching sessions and film reviews
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-2 text-sm text-red-600 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Film Reviews Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Film Reviews ({filmReviews.length})
          </h2>

          {filmReviews.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No film reviews</h3>
              <p className="mt-1 text-sm text-gray-500">
                Request a film review from a coach to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filmReviews.map((booking) => {
                const status = getFilmReviewStatusBadge(booking.review_status);
                const isExpanded = expandedFilmReview === booking.id;

                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          {booking.coach?.avatar_url ? (
                            <img
                              className="h-12 w-12 rounded-full object-cover"
                              src={booking.coach.avatar_url}
                              alt={booking.coach.full_name || 'Coach'}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-[#123C7A] flex items-center justify-center">
                              <span className="text-white text-lg font-semibold">
                                {booking.coach?.full_name?.charAt(0) || 'C'}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-[#123C7A]">
                              {booking.listing?.title || 'Film Review'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              with {booking.coach?.full_name || 'Coach'}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                {status.label}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(booking.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#FF5A1F]">
                            {formatCurrency(booking.amount_paid_cents)}
                          </div>
                          {booking.listing?.turnaround_hours && (
                            <p className="text-xs text-gray-500">
                              {booking.listing.turnaround_hours}h turnaround
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status-specific content */}
                      {booking.review_status === 'pending_acceptance' && (
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                          <p className="text-sm text-yellow-800">
                            Waiting for coach to accept your request. Your card will be charged when they accept.
                          </p>
                        </div>
                      )}

                      {booking.review_status === 'accepted' && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-sm text-blue-800">
                            The coach is currently reviewing your film. You'll be notified when it's complete.
                          </p>
                        </div>
                      )}

                      {booking.review_status === 'declined' && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                          <p className="text-sm text-red-800">
                            The coach declined this request. Your payment has been refunded.
                          </p>
                        </div>
                      )}

                      {/* Show View Review button for completed reviews */}
                      {booking.review_status === 'completed' && (
                        <div className="mt-4">
                          <button
                            onClick={() => setExpandedFilmReview(isExpanded ? null : booking.id)}
                            className="inline-flex items-center px-4 py-2 bg-[#FF5A1F] text-white font-medium rounded-lg hover:bg-[#E44F1B] transition-colors"
                          >
                            <svg className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {isExpanded ? 'Hide Review' : 'View Review'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded Review Content */}
                    {isExpanded && booking.review_status === 'completed' && (
                      <div className="border-t border-gray-200 p-6 bg-gray-50">
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
        </section>

        {/* Live Lessons Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Live Lessons ({liveLessons.length})
          </h2>

          {liveLessons.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No live lessons</h3>
              <p className="mt-1 text-sm text-gray-500">
                Book a coaching session to get started.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              {liveLessons.map((booking) => (
                <div key={booking.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {booking.coach?.avatar_url ? (
                        <img
                          className="h-12 w-12 rounded-full object-cover"
                          src={booking.coach.avatar_url}
                          alt={booking.coach.full_name || 'Coach'}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-[#123C7A] flex items-center justify-center">
                          <span className="text-white text-lg font-semibold">
                            {booking.coach?.full_name?.charAt(0) || 'C'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-medium text-gray-900 mb-1">
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
                        <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500">
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
                      <div className="text-lg font-bold text-[#FF5A1F]">
                        {formatCurrency(booking.amount_paid_cents)}
                      </div>
                      {/* Show Leave Review button for completed live lessons without a review */}
                      {booking.status === 'completed' && !booking.hasReview && (
                        <button
                          onClick={() => setReviewingBookingId(booking.id)}
                          className="bg-[#FF5A1F] hover:bg-[#E44F1B] text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
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
        </section>
      </div>
    </div>
  );
}
