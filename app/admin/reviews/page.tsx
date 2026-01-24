import { createClient } from '@/lib/supabase/server'
import ReviewsTable from '@/components/admin/ReviewsTable'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const supabase = await createClient()

  // Get all reviews with coach and athlete info
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(`
      id,
      booking_id,
      coach_id,
      athlete_id,
      rating,
      comment,
      would_recommend,
      is_hidden,
      hidden_at,
      hidden_by,
      created_at,
      coach:coach_id (
        id,
        full_name
      ),
      athlete:athlete_id (
        id,
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reviews:', error)
  }

  // Get booking/listing info to show what service was reviewed
  const bookingIds = reviews?.filter(r => r.booking_id).map(r => r.booking_id) || []
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, listing_id')
    .in('id', bookingIds)

  const listingIds = bookings?.filter(b => b.listing_id).map(b => b.listing_id) || []
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title')
    .in('id', listingIds as string[])

  // Create lookup maps
  const bookingToListing = new Map(bookings?.map(b => [b.id, b.listing_id]) || [])
  const listingTitles = new Map(listings?.map(l => [l.id, l.title]) || [])

  // Transform data for the table
  const transformedReviews = reviews?.map(review => {
    const coach = Array.isArray(review.coach) ? review.coach[0] : review.coach
    const athlete = Array.isArray(review.athlete) ? review.athlete[0] : review.athlete
    const listingId = bookingToListing.get(review.booking_id)
    const serviceTitle = listingId ? listingTitles.get(listingId) : null

    return {
      id: review.id,
      booking_id: review.booking_id,
      coach_id: review.coach_id,
      athlete_id: review.athlete_id,
      coach_name: (coach as any)?.full_name || 'Unknown Coach',
      athlete_name: (athlete as any)?.full_name || 'Unknown Athlete',
      rating: review.rating,
      comment: review.comment,
      would_recommend: review.would_recommend,
      service_title: serviceTitle || null,
      is_hidden: review.is_hidden || false,
      hidden_at: review.hidden_at,
      created_at: review.created_at
    }
  }) || []

  // Calculate stats
  const totalReviews = transformedReviews.length
  const hiddenReviews = transformedReviews.filter(r => r.is_hidden).length
  const avgRating = totalReviews > 0
    ? transformedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0
  const fiveStarCount = transformedReviews.filter(r => r.rating === 5).length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">Review Management</h1>
        <p className="text-gray-600 mt-2">View and moderate athlete reviews</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-500">Total Reviews</div>
          <div className="text-2xl font-bold text-[#123A72]">{totalReviews}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-500">Average Rating</div>
          <div className="text-2xl font-bold text-[#123A72]">
            {avgRating.toFixed(1)} <span className="text-yellow-500">★</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-500">5-Star Reviews</div>
          <div className="text-2xl font-bold text-green-600">{fiveStarCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-500">Hidden Reviews</div>
          <div className="text-2xl font-bold text-red-600">{hiddenReviews}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <ReviewsTable initialReviews={transformedReviews} />
      </div>
    </div>
  )
}
