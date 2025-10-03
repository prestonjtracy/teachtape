import { createClient } from '@/lib/supabase/server'
import BookingsTable from '@/components/admin/BookingsTable'

export default async function BookingsPage() {
  const supabase = createClient()
  
  // Get legacy bookings with coach and customer info
  const { data: legacyBookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      listing_id,
      coach_id,
      customer_email,
      amount_paid_cents,
      status,
      starts_at,
      ends_at,
      created_at,
      coach:profiles!bookings_coach_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      listing:listings!bookings_listing_id_fkey (
        id,
        title
      )
    `)
    .order('created_at', { ascending: false })

  // Get booking requests with athlete, coach, and listing info
  const { data: bookingRequests, error: requestsError } = await supabase
    .from('booking_requests')
    .select(`
      id,
      listing_id,
      coach_id,
      athlete_id,
      proposed_start,
      proposed_end,
      status,
      created_at,
      updated_at,
      coach:profiles!booking_requests_coach_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      athlete:profiles!booking_requests_athlete_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      listing:listings!booking_requests_listing_id_fkey (
        id,
        title
      )
    `)
    .order('created_at', { ascending: false })

  // Transform legacy bookings to unified format
  const transformedLegacyBookings = legacyBookings?.map(booking => ({
    id: booking.id,
    booking_id: booking.id,
    athlete_name: 'Customer', // Legacy bookings use customer_email, no profile link
    athlete_email: booking.customer_email,
    athlete_avatar: null,
    coach_name: (booking.coach as any)?.[0]?.full_name || 'Unknown Coach',
    coach_avatar: (booking.coach as any)?.[0]?.avatar_url,
    session_date: booking.starts_at,
    session_end: booking.ends_at,
    status: booking.status,
    listing_title: (booking.listing as any)?.[0]?.title || 'Unknown Listing',
    amount_paid: booking.amount_paid_cents,
    created_at: booking.created_at,
    table_type: 'bookings' as const
  })) || []

  // Transform booking requests to unified format
  const transformedBookingRequests = bookingRequests?.map(request => ({
    id: request.id,
    booking_id: request.id,
    athlete_name: (request.athlete as any)?.[0]?.full_name || 'Unknown Athlete',
    athlete_email: null, // Booking requests don't store email directly
    athlete_avatar: (request.athlete as any)?.[0]?.avatar_url,
    coach_name: (request.coach as any)?.[0]?.full_name || 'Unknown Coach',
    coach_avatar: (request.coach as any)?.[0]?.avatar_url,
    session_date: request.proposed_start,
    session_end: request.proposed_end,
    status: request.status,
    listing_title: (request.listing as any)?.[0]?.title || 'Unknown Listing',
    amount_paid: null, // Requests don't have payment info until accepted
    created_at: request.created_at,
    table_type: 'booking_requests' as const
  })) || []

  // Combine both data sources
  const allBookings = [
    ...transformedLegacyBookings,
    ...transformedBookingRequests
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (bookingsError || requestsError) {
    console.error('Error fetching bookings:', { bookingsError, requestsError })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">Booking Management</h1>
        <p className="text-gray-600 mt-2">Manage session bookings and scheduling requests</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <BookingsTable initialBookings={allBookings} />
      </div>
    </div>
  )
}