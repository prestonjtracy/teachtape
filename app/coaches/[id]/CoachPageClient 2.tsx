'use client';

import { useState } from 'react';
import ProfileHeader from '@/components/ProfileHeader';
import ListingCard from '@/components/ListingCard';

interface Coach {
  id: string;
  coach_id?: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
  sport: string | null;
  listings: Array<{
    id: string;
    title: string | null;
    price_cents: number;
    duration_minutes: number;
    description: string | null;
  }>;
}

interface CoachPageClientProps {
  coach: Coach;
  coachId: string;
}

export default function CoachPageClient({ coach }: CoachPageClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleBookService = async (listing: Coach['listings'][0]) => {
    setLoading(listing.id);
    
    try {
      console.log('🔍 [handleBookService] Starting checkout for:', {
        listing_id: listing.id,
        coach_id: coach.id,
        title: listing.title
      });

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listing_id: listing.id,
          coach_id: coach.id
        }),
      });

      const data = await response.json();
      console.log('📦 [handleBookService] Checkout response:', data);
      
      if (!response.ok) {
        // Handle specific error cases with user-friendly messages
        let errorMessage = data.error || 'Failed to create checkout session';
        
        if (errorMessage.includes('Coach payment setup incomplete')) {
          errorMessage = 'This coach hasn\'t completed their payment setup yet. Please try again later or contact the coach directly.';
        } else if (errorMessage.includes('Listing not found')) {
          errorMessage = 'This coaching session is no longer available.';
        }
        
        throw new Error(errorMessage);
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        console.log('🚀 [handleBookService] Redirecting to Stripe:', data.url);
        // Use window.location.assign for better browser history handling
        window.location.assign(data.url);
      } else {
        throw new Error('Checkout session created but no payment URL returned');
      }
    } catch (err) {
      console.error('❌ [handleBookService] Error:', err);
      
      // Show user-friendly error message
      const message = err instanceof Error ? err.message : 'Failed to proceed to checkout';
      alert(`Unable to book session: ${message}`);
      
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F7FB] py-8">
      {/* Profile Header */}
      <div className="mb-12">
        <ProfileHeader
          avatar_url={coach.avatar_url}
          full_name={coach.full_name}
          role={coach.role}
          bio={coach.bio}
          sport={coach.sport}
        />
      </div>

      {/* Listings Section */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {coach.listings.length > 0 ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#123C7A] mb-2">Available Sessions</h2>
              <p className="text-gray-600">Book a coaching session with {coach.full_name?.split(' ')[0] || 'this coach'}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {coach.listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onBookSession={handleBookService}
                  loading={loading === listing.id}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-8 max-w-md mx-auto">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#F5F7FB] flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#123C7A] mb-2">No Sessions Available</h3>
              <p className="text-gray-600 text-sm">
                This coach hasn't published any sessions yet. Check back later!
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}