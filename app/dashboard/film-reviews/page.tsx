'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AcceptDeclineButtons from "./AcceptDeclineButtons";
import UploadReviewForm from "./UploadReviewForm";

interface Booking {
  id: string;
  created_at: string;
  athlete_email: string | null;
  customer_email: string | null;
  athlete_notes: string | null;
  film_url: string | null;
  amount_paid_cents: number;
  review_status: string | null;
  review_completed_at: string | null;
  review_content: any;
  review_document_url: string | null;
  deadline_at: string | null;
  coach_accepted_at: string | null;
  listing: {
    title: string;
    turnaround_hours: number | null;
  } | null;
}

interface CategorizedBookings {
  pending: Booking[];
  accepted: Booking[];
  completed: Booking[];
  declined: Booking[];
}

function formatTimeRemaining(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) return "Overdue";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) {
    return `${hours}h remaining`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h remaining`;
}

export default function FilmReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorized, setCategorized] = useState<CategorizedBookings>({
    pending: [],
    accepted: [],
    completed: [],
    declined: []
  });
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function fetchFilmReviews() {
      try {
        console.log('🔍 [FilmReviews] Fetching from API...');

        const response = await fetch('/api/film-reviews');
        const data = await response.json();

        console.log('📋 [FilmReviews] API response:', { status: response.status });

        if (!response.ok) {
          if (response.status === 401) {
            console.log('❌ [FilmReviews] Unauthorized, redirecting to login');
            router.push('/auth/login');
            return;
          }
          if (response.status === 403) {
            console.log('❌ [FilmReviews] Not a coach, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }
          throw new Error(data.error || 'Failed to load film reviews');
        }

        if (isMounted) {
          setCategorized(data.categorized);
          setLoading(false);
        }
        console.log('✅ [FilmReviews] Loaded film reviews');

      } catch (err) {
        console.error('❌ [FilmReviews] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
          setLoading(false);
        }
      }
    }

    fetchFilmReviews();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5A1F] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading film reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Film Reviews</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { pending, accepted, completed, declined } = categorized;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#123C7A]">Film Reviews</h1>
          <p className="mt-2 text-gray-600">
            Manage athlete film review requests
          </p>
        </div>

        {/* Pending Acceptance */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
            Pending Your Approval ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-500">No pending requests</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pending.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Awaiting Approval
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#123C7A]">
                      {booking.listing?.title || "Film Review Request"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      From: {booking.athlete_email || booking.customer_email || "Unknown"}
                    </p>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Amount</span>
                      <span className="text-lg font-bold text-[#FF5A1F]">
                        ${(booking.amount_paid_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-medium text-gray-700">Turnaround</span>
                      <span className="text-sm text-gray-600">
                        {booking.listing?.turnaround_hours || 48}h
                      </span>
                    </div>
                  </div>

                  {booking.athlete_notes && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Athlete Notes:</p>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                        {booking.athlete_notes}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-4 p-2 bg-amber-50 rounded">
                    <strong>Note:</strong> Film link will be revealed after you accept
                  </div>

                  <AcceptDeclineButtons bookingId={booking.id} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* In Progress */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
            In Progress ({accepted.length})
          </h2>
          {accepted.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-500">No reviews in progress</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {accepted.map((booking) => {
                const isOverdue = booking.deadline_at && new Date(booking.deadline_at) < new Date();
                return (
                  <div
                    key={booking.id}
                    className={`bg-white rounded-xl shadow-sm ring-1 p-6 hover:shadow-md transition-shadow ${
                      isOverdue ? "ring-red-300" : "ring-black/5"
                    }`}
                  >
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          In Progress
                        </span>
                        <span className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-orange-600"}`}>
                          {booking.deadline_at ? formatTimeRemaining(booking.deadline_at) : "No deadline"}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#123C7A]">
                        {booking.listing?.title || "Film Review"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        For: {booking.athlete_email || booking.customer_email || "Unknown"}
                      </p>
                    </div>

                    <div className="mb-4">
                      <a
                        href={booking.film_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-[#123C7A] text-white text-sm font-medium rounded-lg hover:bg-[#0d2d5f] transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Watch Film
                      </a>
                    </div>

                    {booking.athlete_notes && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Focus Areas:</p>
                        <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                          {booking.athlete_notes}
                        </p>
                      </div>
                    )}

                    <UploadReviewForm bookingId={booking.id} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Completed */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
            Completed ({completed.length})
          </h2>
          {completed.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-500">No completed reviews yet</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completed.map((booking) => {
                const reviewContent = booking.review_content as {
                  overallAssessment?: string;
                  strengths?: string;
                  areasForImprovement?: string;
                  recommendedDrills?: string;
                  keyTimestamps?: string;
                  supplementalDocUrl?: string;
                } | null;

                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6"
                  >
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                        <span className="text-sm text-gray-500">
                          {booking.review_completed_at
                            ? new Date(booking.review_completed_at).toLocaleDateString()
                            : ""}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#123C7A]">
                        {booking.listing?.title || "Film Review"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        For: {booking.athlete_email || booking.customer_email || "Unknown"}
                      </p>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-4">
                      <span className="text-sm font-medium text-gray-700">Earned</span>
                      <span className="text-lg font-bold text-green-600">
                        ${(booking.amount_paid_cents / 100).toFixed(2)}
                      </span>
                    </div>

                    {/* Show structured content preview if available */}
                    {reviewContent?.overallAssessment && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs font-medium text-blue-800 mb-1">Review Summary:</p>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {reviewContent.overallAssessment.substring(0, 150)}...
                        </p>
                      </div>
                    )}

                    {/* Show supplemental doc link if available */}
                    {(reviewContent?.supplementalDocUrl || booking.review_document_url) && (
                      <a
                        href={reviewContent?.supplementalDocUrl || booking.review_document_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Supplemental Doc
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Declined */}
        {declined.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
              Declined ({declined.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {declined.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6 opacity-75"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Declined
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Request from {booking.athlete_email || booking.customer_email || "Unknown"} - Refund issued
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
