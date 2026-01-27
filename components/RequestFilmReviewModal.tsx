'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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

interface FeeBreakdown {
  base_price_cents: number;
  service_fee_cents: number;
  total_cents: number;
}

function RequestFilmReviewContent({
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
  const [needsPaymentMethod, setNeedsPaymentMethod] = useState(true);
  const [success, setSuccess] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);

  const stripe = useStripe();
  const elements = useElements();

  // Check if user has saved payment methods and fetch fee breakdown on modal open
  useEffect(() => {
    if (isOpen) {
      checkPaymentMethods();
      // Reset state when modal opens
      setVideoUrl('');
      setNotes('');
      setError('');
      setSuccess(false);
      // Fetch fee breakdown for price transparency
      if (listing.price_cents > 0) {
        fetch(`/api/fee-breakdown?price_cents=${listing.price_cents}`)
          .then(res => res.json())
          .then(data => {
            if (!data.error) {
              setFeeBreakdown(data);
            }
          })
          .catch(err => console.error('Error fetching fee breakdown:', err));
      }
    }
  }, [isOpen, listing.price_cents]);

  const checkPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods/check');
      const data = await response.json();
      setNeedsPaymentMethod(!data.hasPaymentMethods);
    } catch (error) {
      console.error('Error checking payment methods:', error);
      setNeedsPaymentMethod(true); // Assume we need to collect payment method
    }
  };

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
      let paymentMethodId = null;
      let setupIntentId = null;

      // Handle payment method collection if needed
      if (needsPaymentMethod && stripe && elements) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        // First, create a setup intent
        const setupResponse = await fetch('/api/payment-methods/setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const setupData = await setupResponse.json();

        if (!setupResponse.ok) {
          throw new Error(setupData.error || 'Failed to create setup intent');
        }

        // Confirm the setup intent with the card
        const { setupIntent: confirmedSetupIntent, error: confirmError } =
          await stripe.confirmCardSetup(setupData.clientSecret, {
            payment_method: {
              card: cardElement,
            }
          });

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (confirmedSetupIntent?.payment_method) {
          paymentMethodId = confirmedSetupIntent.payment_method as string;
          setupIntentId = confirmedSetupIntent.id;
        }
      }

      // Create the film review request (no charge yet)
      const response = await fetch('/api/film-review/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          coach_id: coachId,
          film_url: videoUrl,
          athlete_notes: notes || '',
          setup_intent_id: setupIntentId,
          payment_method_id: paymentMethodId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create film review request');
      }

      // Show success message
      setSuccess(true);
      setLoading(false);

      // Close modal after a short delay (no redirect to avoid logout)
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (err) {
      console.error('Error creating film review request:', err);
      setError(err instanceof Error ? err.message : 'Failed to create request');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#123C7A] mb-2">Request Sent!</h2>
          <p className="text-gray-600 mb-4">
            Your film review request has been sent to {coachName}. You'll be notified when they accept it.
          </p>
          <p className="text-sm text-gray-500">
            Your card will only be charged if the coach accepts your request.
          </p>
        </div>
      </div>
    );
  }

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
            {listing.turnaround_hours && (
              <div className="mt-3 text-sm text-gray-600">
                {formatTurnaround(listing.turnaround_hours)} turnaround
              </div>
            )}

            {/* Price Breakdown */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Review price</span>
                <span>{formatPrice(listing.price_cents)}</span>
              </div>
              {feeBreakdown && feeBreakdown.service_fee_cents > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Service fee</span>
                  <span>{formatPrice(feeBreakdown.service_fee_cents)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-gray-200">
                <span className="text-[#123C7A]">Total</span>
                <span className="text-xl text-[#FF5A1F]">
                  {feeBreakdown ? formatPrice(feeBreakdown.total_cents) : formatPrice(listing.price_cents)}
                </span>
              </div>
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

          {/* Payment Method Collection */}
          {needsPaymentMethod && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="border border-gray-300 rounded-lg p-4">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                    },
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Your card will only be charged if {coachName} accepts your request.
                </p>
              </div>
            </div>
          )}

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
              disabled={loading || !videoUrl.trim() || (needsPaymentMethod && !stripe)}
              className="flex-1 px-4 py-3 bg-[#FF5A1F] text-white rounded-lg hover:bg-[#E44F1B] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending Request...
                </div>
              ) : (
                'Send Request'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestFilmReviewModal(props: RequestFilmReviewModalProps) {
  return (
    <Elements stripe={stripePromise}>
      <RequestFilmReviewContent {...props} />
    </Elements>
  );
}
