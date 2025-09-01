'use client';

import { useState } from 'react';
import styles from "../styles.module.css";

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

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
}

export default function CoachPageClient({ coach, coachId }: CoachPageClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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
    <main className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {coach.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.avatar_url} alt={coach.full_name ?? "Coach"} />
          ) : (
            getInitials(coach.full_name)
          )}
        </div>
        <div className={styles.name}>{coach.full_name ?? "Unnamed"}</div>
        <div className={styles.role}>{coach.role ?? ""}</div>
        {coach.bio && (
          <div className={styles.bio}>{coach.bio}</div>
        )}
        {coach.sport && (
          <div className={styles.sport}>🎾 {coach.sport}</div>
        )}
      </div>

      {coach.listings.length > 0 ? (
        <div className={styles.grid}>
          {coach.listings.map((listing) => (
            <div key={listing.id} className={styles.card}>
              <div className={styles.name}>{listing.title ?? "Untitled"}</div>
              <div className={styles.role}>
                {formatPrice(listing.price_cents)} · {listing.duration_minutes} min
              </div>
              {listing.description && (
                <div className={styles.description}>{listing.description}</div>
              )}
              
              {/* Book Session Button */}
              <div className="mt-4">
                <button
                  onClick={() => handleBookService(listing)}
                  disabled={loading === listing.id}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === listing.id ? 'Redirecting...' : 'Book Session'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>No active listings found.</div>
      )}
    </main>
  );
}