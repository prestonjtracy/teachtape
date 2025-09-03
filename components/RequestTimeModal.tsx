'use client';

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import 'react-day-picker/dist/style.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Listing {
  id: string;
  title: string | null;
  price_cents: number;
  duration_minutes: number;
  description: string | null;
}

interface RequestTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  coachName: string;
  listing: Listing;
}

// Time options for the dropdown (in 15-minute intervals)
const timeOptions = Array.from({ length: 96 }, (_, i) => {
  const minutes = i * 15;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return {
    value: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
    label: `${hour12}:${String(mins).padStart(2, '0')} ${ampm}`
  };
});

// Timezone detection and options
const detectTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

const commonTimezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'UTC', label: 'UTC' },
];

function RequestTimeContent({ 
  isOpen, 
  onClose, 
  coachId, 
  coachName, 
  listing 
}: RequestTimeModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [timezone, setTimezone] = useState(detectTimezone());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupIntent, setSetupIntent] = useState<string | null>(null);
  const [needsPaymentMethod, setNeedsPaymentMethod] = useState(false);

  const stripe = useStripe();
  const elements = useElements();

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Check if user has saved payment methods on modal open
  useEffect(() => {
    if (isOpen) {
      checkPaymentMethods();
    }
  }, [isOpen]);

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
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create DateTime from selected date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const proposedStart = new Date(selectedDate);
      proposedStart.setHours(hours, minutes, 0, 0);
      
      const proposedEnd = new Date(proposedStart);
      proposedEnd.setMinutes(proposedEnd.getMinutes() + listing.duration_minutes);

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

      // Create the booking request
      const response = await fetch('/api/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          coach_id: coachId,
          proposed_start: proposedStart.toISOString(),
          proposed_end: proposedEnd.toISOString(),
          timezone,
          setup_intent_id: setupIntentId,
          payment_method_id: paymentMethodId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking request');
      }

      // Redirect to conversation thread
      if (data.conversation_id) {
        window.location.href = `/conversations/${data.conversation_id}`;
      } else {
        window.location.href = '/dashboard';
      }

    } catch (err) {
      console.error('Error creating booking request:', err);
      setError(err instanceof Error ? err.message : 'Failed to create request');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#123C7A]">
                Request Time with {coachName}
              </h2>
              <p className="text-gray-600 mt-1">Choose your preferred date and time</p>
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
                {listing.duration_minutes} minutes
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Date
              </label>
              <div className="border border-gray-200 rounded-lg p-4">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={{ before: tomorrow }}
                  className="rdp-caption_center"
                />
              </div>
            </div>

            {/* Time and Timezone */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Time
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent"
                >
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent"
                >
                  {commonTimezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                  {!commonTimezones.find(tz => tz.value === timezone) && (
                    <option value={timezone}>{timezone}</option>
                  )}
                </select>
              </div>

              {selectedDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800">Proposed Time:</p>
                  <p className="text-sm text-blue-600">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-blue-600">
                    {selectedTime} - {(() => {
                      const [hours, minutes] = selectedTime.split(':').map(Number);
                      const endTime = new Date();
                      endTime.setHours(hours, minutes + listing.duration_minutes, 0, 0);
                      return endTime.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                      });
                    })()} ({timezone})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Collection */}
          {needsPaymentMethod && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Save Payment Method
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
                  Your payment method will be saved for future bookings. No charges will be made until your request is accepted.
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
              disabled={loading || !selectedDate}
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

export default function RequestTimeModal(props: RequestTimeModalProps) {
  return (
    <Elements stripe={stripePromise}>
      <RequestTimeContent {...props} />
    </Elements>
  );
}