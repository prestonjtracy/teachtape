'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';

const EmailSchema = z.string().email('Invalid email address');
const NameSchema = z.string().min(1, 'Name is required');

interface Service {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
}

interface Availability {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  coachName: string;
  service: Service;
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  coachId, 
  coachName, 
  service 
}: BookingModalProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [athleteName, setAthleteName] = useState('');
  const [athleteEmail, setAthleteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: service.currency.toUpperCase()
    }).format(cents / 100);
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const fetchAvailabilities = async () => {
    setLoadingSlots(true);
    setError('');
    
    try {
      const fromDate = new Date();
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 14); // Next 2 weeks
      
      const response = await fetch(
        `/api/availabilities?coachId=${coachId}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch availabilities');
      }
      
      setAvailabilities(data.availabilities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load available times');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailabilities();
    }
  }, [isOpen, coachId]);

  const handleBooking = async () => {
    setError('');
    
    // Validate inputs
    try {
      NameSchema.parse(athleteName);
      EmailSchema.parse(athleteEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    setLoading(true);
    
    try {
      const selectedAvailability = availabilities.find(a => a.id === selectedSlot);
      if (!selectedAvailability) {
        throw new Error('Selected time slot is no longer available');
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId,
          serviceId: service.id,
          startsAt: selectedAvailability.starts_at,
          athleteName,
          athleteEmail
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
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to proceed to checkout');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Book Session with {coachName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-900">{service.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{service.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">
                {formatPrice(service.price_cents)}
              </span>
              <span className="text-sm text-gray-600">
                {service.duration_minutes} minutes
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={athleteName}
              onChange={(e) => setAthleteName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Email
            </label>
            <input
              type="email"
              value={athleteEmail}
              onChange={(e) => setAthleteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Time Slot
            </label>
            {loadingSlots ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading available times...</p>
              </div>
            ) : availabilities.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">No available times in the next 2 weeks</p>
                <button
                  onClick={fetchAvailabilities}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availabilities.map((slot) => (
                  <label key={slot.id} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="timeSlot"
                      value={slot.id}
                      checked={selectedSlot === slot.id}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="mr-3 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">
                      {formatDateTime(slot.starts_at)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleBooking}
              disabled={loading || !selectedSlot || !athleteName || !athleteEmail}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Book for ${formatPrice(service.price_cents)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}