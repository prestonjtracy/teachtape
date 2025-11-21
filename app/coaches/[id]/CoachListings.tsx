'use client';

import { useState } from 'react';
import ListingCard from '@/components/ListingCard';

interface Listing {
  id: string;
  title: string | null;
  price_cents: number;
  duration_minutes: number;
  listing_type?: 'live_lesson' | 'film_review';
  turnaround_hours?: number | null;
  description: string | null;
}

interface CoachListingsProps {
  liveLessons: Listing[];
  filmReviews: Listing[];
  coachFirstName: string;
}

export default function CoachListings({ liveLessons, filmReviews, coachFirstName }: CoachListingsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleBookSession = (listing: Listing) => {
    setLoading(listing.id);
    // For film reviews, scroll to the details section
    if (listing.listing_type === 'film_review') {
      const element = document.getElementById(`film-review-${listing.id}`);
      element?.scrollIntoView({ behavior: 'smooth' });
      setLoading(null);
    } else {
      // For live lessons, you can add navigation logic here
      console.log('Book live lesson:', listing.id);
      setLoading(null);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
      {liveLessons.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#123C7A", marginBottom: "0.5rem" }}>
            Live Lessons
          </h2>
          <p style={{ color: "#6B7280", marginBottom: "2rem" }}>
            Book a coaching session with {coachFirstName}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {liveLessons.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={{
                  ...listing,
                  listing_type: 'live_lesson'
                }}
                onBookSession={handleBookSession}
                loading={loading === listing.id}
                bookingFlow="request"
              />
            ))}
          </div>
        </section>
      )}

      {filmReviews.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#123C7A", marginBottom: "0.5rem" }}>
            Film Review
          </h2>
          <p style={{ color: "#6B7280", marginBottom: "2rem" }}>
            Get personalized film analysis from {coachFirstName}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filmReviews.map((listing) => (
              <div key={listing.id}>
                <ListingCard
                  listing={{
                    ...listing,
                    listing_type: 'film_review',
                    turnaround_hours: listing.turnaround_hours || 48
                  }}
                  onBookSession={handleBookSession}
                  loading={loading === listing.id}
                  bookingFlow="request"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
