'use client';

import { useState } from 'react';

interface Listing {
  id: string;
  title: string | null;
  price_cents: number;
  turnaround_hours?: number | null;
  description: string | null;
}

interface RequestFilmReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  coachName: string;
  listing: Listing;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTurnaround(hours: number): string {
  if (hours < 24) {
    return `${hours}h turnaround`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  return `${days}d ${remainingHours}h`;
}

export default function RequestFilmReviewModal({
  isOpen,
  onClose,
  coachId,
  coachName,
  listing
}: RequestFilmReviewModalProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a video URL');
      return;
    }

    // Validate URL format
    try {
      new URL(videoUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create Stripe checkout session for film review
      const response = await fetch('/api/film-review/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          coach_id: coachId,
          film_url: videoUrl,
          athlete_notes: notes || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Checkout session created but no payment URL returned');
      }

    } catch (err) {
      console.error('Error creating film review request:', err);
      setError(err instanceof Error ? err.message : 'Failed to create request');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#123C7A]">
                Request Film Review from {coachName}
              </h2>
              <p className="text-gray-600 mt-1">Submit your video for analysis</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Service Info */}
          <div className="bg-[#F5F7FB] rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-[#123C7A] text-lg">{listing.title}</h3>
            {listing.description && (
              <p className="text-gray-600 text-sm mt-1">{listing.description}</p>
            )}
            <div className="flex justify-between items-center mt-3">
              <span className="text-xl font-bold text-[#FF5A1F]">
                {formatPrice(listing.price_cents)}
              </span>
              <span className="text-gray-600">
                {listing.turnaround_hours && formatTurnaround(listing.turnaround_hours)} turnaround
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Video URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Video URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://hudl.com/... or https://youtube.com/..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported platforms: Hudl, YouTube, Vimeo
            </p>
          </div>

          {/* Notes Textarea */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What would you like the coach to focus on?"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Let the coach know specific areas you'd like them to analyze
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !videoUrl.trim()}
              className="flex-1 px-4 py-3 bg-[#FF5A1F] text-white rounded-lg hover:bg-[#E44F1B] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Continue to Payment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
