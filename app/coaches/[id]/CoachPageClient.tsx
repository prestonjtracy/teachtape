'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import RequestTimeModal from '@/components/RequestTimeModal';
import RequestFilmReviewModal from '@/components/RequestFilmReviewModal';
import CoachGalleryDisplay from '@/components/CoachGalleryDisplay';

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

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  would_recommend: boolean | null;
  created_at: string;
  athlete: {
    full_name: string | null;
  };
  service_title: string | null;
}

interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  recommendationRate: number;
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [recommendationRate, setRecommendationRate] = useState<number>(0);

  // Get booking flow from environment (default to 'request')
  const bookingFlow = (process.env.NEXT_PUBLIC_BOOKING_FLOW as 'legacy' | 'request') || 'request';

  // Fetch reviews
  useEffect(() => {
    async function fetchReviews() {
      try {
        const response = await fetch(`/api/reviews/${coach.id}`);
        if (response.ok) {
          const data: ReviewsResponse = await response.json();
          setReviews(data.reviews || []);
          setRecommendationRate(data.recommendationRate || 0);
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
  }, [coach.id]);

  // Separate listings by type
  const liveLessons = coach.listings.filter(l => !l.listing_type || l.listing_type === 'live_lesson');
  const filmReviews = coach.listings.filter(l => l.listing_type === 'film_review');

  // Calculate stats
  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;
  const lowestPrice = coach.listings.length > 0
    ? Math.min(...coach.listings.map(l => l.price_cents)) / 100
    : 0;

  const handleBookService = async (listing: Listing) => {
    if (bookingFlow === 'request') {
      if (listing.listing_type === 'film_review') {
        setSelectedListing(listing);
        setShowFilmReviewModal(true);
        return;
      }
      setSelectedListing(listing);
      setShowRequestModal(true);
      return;
    }

    // Legacy flow: Direct checkout
    setLoading(listing.id);

    try {
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

      if (!response.ok) {
        let errorMessage = data.error || 'Failed to create checkout session';

        if (errorMessage.includes('Coach payment setup incomplete')) {
          errorMessage = 'This coach hasn\'t completed their payment setup yet. Please try again later or contact the coach directly.';
        } else if (errorMessage.includes('Listing not found')) {
          errorMessage = 'This coaching session is no longer available.';
        }

        throw new Error(errorMessage);
      }

      if (data.url) {
        window.location.assign(data.url);
      } else {
        throw new Error('Checkout session created but no payment URL returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to proceed to checkout';
      alert(`Unable to book session: ${message}`);
      setLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#123C7A] via-[#1E5BB5] to-[#123C7A] overflow-hidden">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar with Verified Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
                {coach.avatar_url ? (
                  <Image
                    src={coach.avatar_url}
                    alt={coach.full_name || 'Coach'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#F45A14] to-[#FF8A50] flex items-center justify-center">
                    <span className="text-5xl font-bold text-white">
                      {coach.full_name?.charAt(0).toUpperCase() || 'C'}
                    </span>
                  </div>
                )}
              </div>
              {/* Verified Badge */}
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-lg">
                <div className="bg-green-500 rounded-full p-1.5">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Coach Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {coach.full_name || 'Coach'}
              </h1>

              {/* Badges Row */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                {coach.sport && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {coach.sport}
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/90 text-white">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified Coach
                </span>
              </div>

              {/* Rating */}
              {reviews.length > 0 && (
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-white/30'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-white font-semibold">{averageRating.toFixed(1)}</span>
                  <span className="text-white/70">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-6">
                <div className="text-center md:text-left">
                  <div className="text-2xl font-bold text-white">{coach.listings.length}</div>
                  <div className="text-sm text-white/70">Services</div>
                </div>
                {lowestPrice > 0 && (
                  <div className="text-center md:text-left">
                    <div className="text-2xl font-bold text-white">From ${lowestPrice}</div>
                    <div className="text-sm text-white/70">Starting Price</div>
                  </div>
                )}
                <div className="text-center md:text-left">
                  <div className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-1">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Fast
                  </div>
                  <div className="text-sm text-white/70">Response Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges - Floating Cards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Verified</div>
              <div className="text-xs text-gray-500">ID Confirmed</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Quick Reply</div>
              <div className="text-xs text-gray-500">Responds fast</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Top Rated</div>
              <div className="text-xs text-gray-500">{reviews.length > 0 ? `${averageRating.toFixed(1)} stars` : 'New coach'}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#F45A14]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Secure Pay</div>
              <div className="text-xs text-gray-500">Stripe protected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            {coach.bio && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-[#123C7A] mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    About {coach.full_name?.split(' ')[0] || 'Coach'}
                  </h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{coach.bio}</p>
                </div>
              </section>
            )}

            {/* Gallery Section */}
            <CoachGalleryDisplay
              coachId={coach.id}
              coachName={coach.full_name || undefined}
            />

            {/* Live Lessons Section */}
            {liveLessons.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#123C7A]/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#123C7A]">Live Lessons</h2>
                      <p className="text-sm text-gray-500">1-on-1 coaching sessions</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {liveLessons.map((listing) => (
                      <div
                        key={listing.id}
                        className="group relative bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 p-5 hover:border-[#123C7A]/30 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                              {listing.title || 'Coaching Session'}
                            </h3>
                            {listing.description && (
                              <p className="text-gray-500 text-sm mb-3 line-clamp-2">{listing.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1.5 text-gray-600">
                                <svg className="w-4 h-4 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {listing.duration_minutes} min
                              </span>
                              <span className="flex items-center gap-1.5 text-gray-600">
                                <svg className="w-4 h-4 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Video Call
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-[#123C7A]">{formatPrice(listing.price_cents)}</div>
                            </div>
                            <button
                              onClick={() => handleBookService(listing)}
                              disabled={loading === listing.id}
                              className="px-6 py-3 bg-gradient-to-r from-[#F45A14] to-[#FF7A3D] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {loading === listing.id ? (
                                <span className="flex items-center gap-2">
                                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Booking...
                                </span>
                              ) : (
                                'Request Time'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Film Reviews Section */}
            {filmReviews.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-500/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#123C7A]">Film Reviews</h2>
                      <p className="text-sm text-gray-500">Personalized game film analysis</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {filmReviews.map((listing) => (
                      <div
                        key={listing.id}
                        className="group relative bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-100 p-5 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                              {listing.title || 'Film Review'}
                            </h3>
                            {listing.description && (
                              <p className="text-gray-500 text-sm mb-3 line-clamp-2">{listing.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              {listing.turnaround_hours && (
                                <span className="flex items-center gap-1.5 text-gray-600">
                                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {listing.turnaround_hours}h turnaround
                                </span>
                              )}
                              <span className="flex items-center gap-1.5 text-gray-600">
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Detailed breakdown
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-purple-600">{formatPrice(listing.price_cents)}</div>
                            </div>
                            <button
                              onClick={() => handleBookService(listing)}
                              disabled={loading === listing.id}
                              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {loading === listing.id ? (
                                <span className="flex items-center gap-2">
                                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Booking...
                                </span>
                              ) : (
                                'Request Review'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-xl font-bold text-[#123C7A] flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Reviews
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-[#123C7A]">{averageRating.toFixed(1)}</span>
                        <div className="text-sm text-gray-500">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</div>
                      </div>
                      {recommendationRate > 0 && (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          <span>{recommendationRate}% recommend</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {reviews.slice(0, 10).map((review) => {
                      const athleteName = review.athlete?.full_name || 'Athlete';
                      const firstNameOnly = athleteName.split(' ')[0];
                      return (
                        <div key={review.id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-sm">
                                {athleteName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1 gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-gray-900">{firstNameOnly}</span>
                                  {review.would_recommend && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Recommends
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm text-gray-400 whitespace-nowrap">
                                  {new Date(review.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                {renderStars(review.rating)}
                                {review.service_title && (
                                  <span className="text-xs text-[#123C7A] bg-blue-50 px-2 py-0.5 rounded-full">
                                    {review.service_title}
                                  </span>
                                )}
                              </div>
                              {review.comment && (
                                <p className="text-gray-600">{review.comment}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {reviews.length > 10 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                      Showing 10 most recent reviews
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Book Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-6">
              <div className="p-6 bg-gradient-to-r from-[#F45A14] to-[#FF7A3D]">
                <h3 className="text-lg font-bold text-white mb-1">Ready to improve?</h3>
                <p className="text-white/80 text-sm">Book a session with {coach.full_name?.split(' ')[0] || 'this coach'}</p>
              </div>
              <div className="p-6">
                {lowestPrice > 0 && (
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-sm text-gray-500">Starting at</span>
                    <span className="text-3xl font-bold text-[#123C7A]">${lowestPrice}</span>
                  </div>
                )}
                <div className="space-y-3">
                  {liveLessons.length > 0 && (
                    <button
                      onClick={() => {
                        const element = document.querySelector('[data-section="live-lessons"]');
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full py-3 bg-gradient-to-r from-[#F45A14] to-[#FF7A3D] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      Book Live Lesson
                    </button>
                  )}
                  {filmReviews.length > 0 && (
                    <button
                      onClick={() => {
                        const element = document.querySelector('[data-section="film-reviews"]');
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      Request Film Review
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews Summary Card */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold text-[#123C7A]">{averageRating.toFixed(1)}</div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-200'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <div className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                {/* Star distribution bars */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = reviews.filter(r => Math.round(r.rating) === stars).length;
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-sm">
                        <span className="w-3 text-gray-500">{stars}</span>
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-gray-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contact Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Have questions?</h3>
              <p className="text-sm text-gray-500 mb-4">
                Reach out to {coach.full_name?.split(' ')[0] || 'this coach'} directly through the booking process.
              </p>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-green-800">Typically responds quickly</div>
                  <div className="text-xs text-green-600">Within a few hours</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
