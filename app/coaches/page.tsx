import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

interface Profile {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  sport: string | null;
  bio: string | null;
  listings: {
    id: string;
    title: string;
    price_cents: number;
  }[];
  reviews?: {
    rating: number;
  }[];
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAverageRating(reviews: { rating: number }[] | undefined): number {
  if (!reviews || reviews.length === 0) return 0;
  return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-1 text-sm text-gray-600">
        {rating > 0 ? rating.toFixed(1) : 'New'} {reviewCount > 0 && `(${reviewCount})`}
      </span>
    </div>
  );
}

export default async function CoachesPage() {
  try {
    const supabase = createClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id, full_name, role, avatar_url, sport, bio,
        listings:listings(id, title, price_cents, is_active),
        reviews:reviews(rating)
      `)
      .eq("role", "coach");

    if (error) throw error;

    // Filter to only show coaches with active listings, and filter their listings
    const coachesWithActiveListings = (profiles || [])
      .map(profile => ({
        ...profile,
        listings: (profile.listings || []).filter((l: any) => l.is_active)
      }))
      .filter(profile => profile.listings.length > 0);

    // Get unique sports for filter
    const sports = [...new Set(coachesWithActiveListings?.filter(p => p.sport).map(p => p.sport) || [])];

    if (!coachesWithActiveListings || coachesWithActiveListings.length === 0) {
      return (
        <div className="min-h-screen bg-[#F8FAFC]">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Find Your Perfect Coach
                </h1>
                <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                  Connect with expert coaches for personalized 1:1 lessons and detailed film analysis
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No coaches available yet</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Be the first to join as a coach or check back later for available coaches.
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center px-6 py-3 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-xl transition-colors"
              >
                Join as a Coach
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Find Your Perfect Coach
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
                Connect with expert coaches for personalized 1:1 lessons and detailed film analysis
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl p-2 shadow-lg flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search coaches by name..."
                      className="w-full pl-12 pr-4 py-3 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F45A14]"
                    />
                  </div>
                  <button className="px-6 py-3 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-lg transition-colors">
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Pills */}
          {sports.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8 -mt-6">
              <button className="px-4 py-2 bg-[#123C7A] text-white text-sm font-medium rounded-full shadow-md">
                All Sports
              </button>
              {sports.map((sport) => (
                <button
                  key={sport}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-full shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  {sport}
                </button>
              ))}
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">{coachesWithActiveListings.length}</span> coach{coachesWithActiveListings.length !== 1 ? 'es' : ''} available
            </p>
            <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F45A14]">
              <option>Sort by: Recommended</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Rating: High to Low</option>
            </select>
          </div>

          {/* Coaches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coachesWithActiveListings.map((profile: Profile) => {
              const avgRating = getAverageRating(profile.reviews);
              const reviewCount = profile.reviews?.length || 0;
              const lowestPrice = profile.listings && profile.listings.length > 0
                ? Math.min(...profile.listings.map(l => l.price_cents))
                : null;

              return (
                <Link
                  key={profile.id}
                  href={`/coaches/${profile.id}`}
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-[#F45A14]/30 transition-all duration-300"
                >
                  {/* Card Header with Avatar */}
                  <div className="relative p-6 pb-0">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name ?? "Coach"}
                            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-gray-50 group-hover:ring-[#F45A14]/20 transition-all"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center ring-4 ring-gray-50 group-hover:ring-[#F45A14]/20 transition-all">
                            <span className="text-2xl font-bold text-white">
                              {getInitials(profile.full_name)}
                            </span>
                          </div>
                        )}
                        {/* Verified Badge */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>

                      {/* Name and Sport */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#F45A14] transition-colors truncate">
                          {profile.full_name ?? "Unnamed Coach"}
                        </h3>
                        {profile.sport && (
                          <span className="inline-flex items-center mt-1 px-3 py-1 bg-[#123C7A]/10 text-[#123C7A] text-sm font-medium rounded-full">
                            {profile.sport}
                          </span>
                        )}
                        <div className="mt-2">
                          <StarRating rating={Math.round(avgRating)} reviewCount={reviewCount} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="px-6 py-4">
                    {profile.bio ? (
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {profile.bio}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm italic">
                        No bio available
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      {lowestPrice !== null ? (
                        <div>
                          <span className="text-sm text-gray-500">Starting at</span>
                          <p className="text-xl font-bold text-[#F45A14]">
                            ${(lowestPrice / 100).toFixed(0)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Contact for pricing</span>
                      )}
                    </div>
                    <div className="flex items-center text-[#F45A14] font-semibold group-hover:translate-x-1 transition-transform">
                      View Profile
                      <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Load More */}
          {coachesWithActiveListings.length >= 6 && (
            <div className="mt-12 text-center">
              <button className="px-8 py-3 bg-white border-2 border-[#123C7A] text-[#123C7A] font-semibold rounded-xl hover:bg-[#123C7A] hover:text-white transition-colors">
                Load More Coaches
              </button>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Are you a coach?
            </h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              Join TeachTape and connect with athletes looking to improve their game. Set your own rates and schedule.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center px-6 py-3 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
            >
              Become a Coach
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Error loading coaches:", err);
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Find Your Perfect Coach
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-8">
              We couldn't load the coaches. Please try again.
            </p>
            <a
              href="/coaches"
              className="inline-flex items-center px-6 py-3 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-xl transition-colors"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    );
  }
}
