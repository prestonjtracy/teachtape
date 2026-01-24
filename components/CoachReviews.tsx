'use client';

import { useEffect, useState } from 'react';

interface ReviewWithDetails {
  id: string;
  booking_id: string;
  coach_id: string;
  athlete_id: string;
  rating: number;
  comment: string | null;
  would_recommend: boolean | null;
  created_at: string;
  athlete: {
    full_name: string | null;
  };
  service_title: string | null;
}

interface ReviewsResponseWithDetails {
  reviews: ReviewWithDetails[];
  averageRating: number;
  totalReviews: number;
  recommendationRate?: number;
}

interface CoachReviewsProps {
  coachId: string;
  coachName: string;
}

export default function CoachReviews({ coachId, coachName }: CoachReviewsProps) {
  const [data, setData] = useState<ReviewsResponseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const response = await fetch(`/api/reviews/${coachId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        const reviewsData = await response.json();
        setData(reviewsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [coachId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-8">
        <p className="text-red-600">Failed to load reviews</p>
      </div>
    );
  }

  if (!data || data.totalReviews === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-text mb-2">No reviews yet</h3>
        <p className="text-sm text-neutral-text-secondary">
          Be the first to leave a review for {coachName}!
        </p>
      </div>
    );
  }

  const { reviews, averageRating, totalReviews, recommendationRate } = data;

  // Helper to render stars
  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'text-2xl' : 'text-base';
    return (
      <div className={`flex gap-0.5 ${starSize}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Get athlete first name only
  const getFirstName = (fullName: string | null) => {
    if (!fullName) return 'Anonymous';
    return fullName.split(' ')[0];
  };

  return (
    <section className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#123C7A] mb-4">Reviews</h2>

        {/* Average Rating Summary */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-ttBlue mb-1">
                {averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(averageRating), 'lg')}
            </div>
            <div className="border-l border-gray-200 pl-6">
              <p className="text-sm text-neutral-text-secondary">
                Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
              {recommendationRate !== undefined && recommendationRate > 0 && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  {recommendationRate}% would recommend
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-semibold text-neutral-text">
                    {getFirstName(review.athlete.full_name)}
                  </span>
                  {renderStars(review.rating)}
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-text-muted">
                  <span>{formatDate(review.created_at)}</span>
                  {review.service_title && (
                    <>
                      <span>•</span>
                      <span className="text-[#123C7A]">{review.service_title}</span>
                    </>
                  )}
                </div>
              </div>
              {review.would_recommend && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  Recommends
                </span>
              )}
            </div>

            {review.comment && (
              <p className="text-neutral-text-secondary leading-relaxed">
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>

      {totalReviews === 10 && (
        <p className="text-center text-sm text-neutral-text-muted mt-4">
          Showing 10 most recent reviews
        </p>
      )}
    </section>
  );
}
