interface Listing {
  id: string;
  title: string | null;
  price_cents: number;
  duration_minutes: number;
  description: string | null;
  image_url?: string | null;
  listing_type?: 'live_lesson' | 'film_review';
  turnaround_hours?: number | null;
}

interface ListingCardProps {
  listing: Listing;
  onBookSession: (listing: Listing) => void;
  loading: boolean;
  bookingFlow?: 'legacy' | 'request';
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hr${hours > 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes} min`;
}

function formatTurnaround(hours: number): string {
  if (hours < 24) {
    return `${hours}h turnaround`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days} day${days > 1 ? 's' : ''} turnaround`;
  }
  return `${days}d ${remainingHours}h turnaround`;
}

export default function ListingCard({ listing, onBookSession, loading, bookingFlow = 'request' }: ListingCardProps) {
  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all duration-200 overflow-hidden group h-full flex flex-col">
      {/* Optional Image */}
      {listing.image_url && (
        <div className="h-48 overflow-hidden">
          <img
            src={listing.image_url}
            alt={listing.title || "Listing image"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}
      
      <div className="p-6 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-xl font-bold text-[#123C7A] mb-3 group-hover:text-[#FF5A1F] transition-colors">
          {listing.title || "Untitled Session"}
        </h3>

        {/* Price and Duration/Turnaround */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-lg font-semibold text-[#123C7A]">
              <svg className="w-5 h-5 mr-2 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              {formatPrice(listing.price_cents)}
            </div>
            <div className="flex items-center text-sm font-medium text-gray-600">
              <svg className="w-4 h-4 mr-1.5 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {listing.listing_type === 'film_review' && listing.turnaround_hours
                ? formatTurnaround(listing.turnaround_hours)
                : formatDuration(listing.duration_minutes)}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 mb-6">
          {listing.description && (
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
              {listing.description}
            </p>
          )}
        </div>

        {/* Book Session Button */}
        <button
          onClick={() => onBookSession(listing)}
          disabled={loading}
          className="w-full bg-[#FF5A1F] text-white font-semibold py-3 px-6 rounded-lg 
                     hover:bg-[#E44F1B] focus:ring-2 focus:ring-[#123C7A] focus:ring-offset-2 
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
                     shadow-md hover:shadow-lg mt-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Redirecting...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {bookingFlow === 'request' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                )}
              </svg>
              {listing.listing_type === 'film_review'
                ? 'Request Review'
                : (bookingFlow === 'request' ? 'Request Time' : 'Book Session')
              }
            </div>
          )}
        </button>
      </div>

      {/* Subtle bottom accent */}
      <div className="h-1 bg-gradient-to-r from-[#FF5A1F] to-[#123C7A] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
    </div>
  );
}