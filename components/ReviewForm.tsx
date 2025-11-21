'use client';

import { useState } from 'react';

interface ReviewFormProps {
  bookingId: string;
  coachName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({
  bookingId,
  coachName,
  onSuccess,
  onCancel
}: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingId,
          rating,
          comment: comment.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSubmitted(true);
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-ttBlue mb-2">Review Submitted!</h3>
        <p className="text-neutral-text-secondary">
          Thank you for sharing your feedback
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-ttBlue mb-2">
          Leave a Review for {coachName}
        </h3>
        <p className="text-sm text-neutral-text-secondary">
          Share your experience to help other athletes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-semibold text-neutral-text mb-3">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-4xl transition-all focus:outline-none focus:scale-110"
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
              >
                <span
                  className={
                    star <= (hoverRating || rating)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }
                >
                  ★
                </span>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-2 text-sm text-neutral-text-secondary">
              {rating === 5 && 'Excellent!'}
              {rating === 4 && 'Great!'}
              {rating === 3 && 'Good'}
              {rating === 2 && 'Fair'}
              {rating === 1 && 'Poor'}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-semibold text-neutral-text mb-2">
            Comment (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ttOrange focus:border-ttOrange transition-colors resize-none"
            placeholder="Share details about your experience..."
          />
          <div className="mt-1 text-xs text-neutral-text-muted text-right">
            {comment.length}/500 characters
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="flex-1 bg-ttOrange text-white px-6 py-3 rounded-lg font-semibold hover:bg-ttOrange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-neutral-text rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
