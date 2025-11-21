'use client';

import { useState } from 'react';
import ProfileHeader from '@/components/ProfileHeader';
import ListingCard from '@/components/ListingCard';
import RequestTimeModal from '@/components/RequestTimeModal';
import RequestFilmReviewModal from '@/components/RequestFilmReviewModal';
import CoachGalleryDisplay from '@/components/CoachGalleryDisplay';
import CoachReviews from '@/components/CoachReviews';

interface Listing {
  id: string;
  title: string | null;
  price_cents: number;
  duration_minutes: number;
  description: string | null;
  listing_type?: 'live_lesson' | 'film_review';
  turnaround_hours?: number | null;
}

interface Coach {
  id: string;
  coach_id?: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
  sport: string | null;
  listings: Listing[];
}

interface CoachPageClientProps {
  coach: Coach;
  coachId: string;
}

export default function CoachPageClient({ coach }: CoachPageClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFilmReviewModal, setShowFilmReviewModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Get booking flow from environment (default to 'request')
  const bookingFlow = (process.env.NEXT_PUBLIC_BOOKING_FLOW as 'legacy' | 'request') || 'request';

  // Debug: Log the actual listing data
  console.log('🔍 [CoachPageClient] All listings:', coach.listings);
  console.log('🔍 [CoachPageClient] Sample listing:', coach.listings[0]);

  // Separate listings by type
  const liveLessons = coach.listings.filter(l => !l.listing_type || l.listing_type === 'live_lesson');
  const filmReviews = coach.listings.filter(l => l.listing_type === 'film_review');

  console.log('🔍 [CoachPageClient] Film reviews:', filmReviews);

  const handleBookService = async (listing: Listing) => {
    if (bookingFlow === 'request') {
      // Check if this is a film review or live lesson
      if (listing.listing_type === 'film_review') {
        setSelectedListing(listing);
        setShowFilmReviewModal(true);
        return;
      }
      // New flow: Show request time modal for live lessons
      setSelectedListing(listing);
      setShowRequestModal(true);
      return;
    }

    // Legacy flow: Direct checkout
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

      {/* Gallery Section */}
      <CoachGalleryDisplay
        coachId={coach.id}
        coachName={coach.full_name || undefined}
      />

      {/* Live Lessons Section */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {liveLessons.length > 0 && (
          <section className="mb-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#123C7A] mb-2">Live Lessons</h2>
              <p className="text-gray-600">Book a 1-on-1 coaching session with {coach.full_name?.split(' ')[0] || 'this coach'}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {liveLessons.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onBookSession={handleBookService}
                  loading={loading === listing.id}
                  bookingFlow={bookingFlow}
                />
              ))}
            </div>
          </section>
        )}

        {/* Film Reviews Section */}
        {filmReviews.length > 0 && (
          <section className="mb-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#123C7A] mb-2">Film Reviews</h2>
              <p className="text-gray-600">Get personalized analysis of your game film</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filmReviews.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onBookSession={handleBookService}
                  loading={loading === listing.id}
                  bookingFlow={bookingFlow}
                />
              ))}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <CoachReviews coachId={coach.id} coachName={coach.full_name || 'this coach'} />
      </div>

      {/* Request Time Modal (for live lessons) */}
      {showRequestModal && selectedListing && selectedListing.listing_type !== 'film_review' && (
        <RequestTimeModal
          isOpen={showRequestModal}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedListing(null);
          }}
          coachId={coach.id}
          coachName={coach.full_name || 'Coach'}
          listing={selectedListing}
        />
      )}

      {/* Request Film Review Modal */}
      {showFilmReviewModal && selectedListing && selectedListing.listing_type === 'film_review' && (
        <RequestFilmReviewModal
          isOpen={showFilmReviewModal}
          onClose={() => {
            setShowFilmReviewModal(false);
            setSelectedListing(null);
          }}
          coachId={coach.id}
          coachName={coach.full_name || 'Coach'}
          listing={selectedListing}
        />
      )}
    </main>
  );
}
