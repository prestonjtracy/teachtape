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
        title,
        price_cents
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
        title,
        price_cents
      )
    `)
    .order('created_at', { ascending: false })

  // Transform legacy bookings to unified format
  const transformedLegacyBookings = legacyBookings?.map(booking => {
    // Handle joined data - could be array or object depending on Supabase response
    const coach = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach
    const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing

    return {
      id: booking.id,
      booking_id: booking.id,
      athlete_name: 'Customer', // Legacy bookings use customer_email, no profile link
      athlete_email: booking.customer_email,
      athlete_avatar: null,
      coach_name: (coach as any)?.full_name || 'Unknown Coach',
      coach_avatar: (coach as any)?.avatar_url,
      session_date: booking.starts_at,
      session_end: booking.ends_at,
      status: booking.status,
      listing_title: (listing as any)?.title || 'Unknown Listing',
      amount_paid: booking.amount_paid_cents || (listing as any)?.price_cents,
      created_at: booking.created_at,
      table_type: 'bookings' as const
    }
  }) || []

  // Transform booking requests to unified format
  const transformedBookingRequests = bookingRequests?.map(request => {
    // Handle joined data - could be array or object depending on Supabase response
    const athlete = Array.isArray(request.athlete) ? request.athlete[0] : request.athlete
    const coach = Array.isArray(request.coach) ? request.coach[0] : request.coach
    const listing = Array.isArray(request.listing) ? request.listing[0] : request.listing

    return {
      id: request.id,
      booking_id: request.id,
      athlete_name: (athlete as any)?.full_name || 'Unknown Athlete',
      athlete_email: null, // Booking requests don't store email directly
      athlete_avatar: (athlete as any)?.avatar_url,
      coach_name: (coach as any)?.full_name || 'Unknown Coach',
      coach_avatar: (coach as any)?.avatar_url,
      session_date: request.proposed_start,
      session_end: request.proposed_end,
      status: request.status,
      listing_title: (listing as any)?.title || 'Unknown Listing',
      amount_paid: (listing as any)?.price_cents, // Show listing price for booking requests
      created_at: request.created_at,
      table_type: 'booking_requests' as const
    }
  }) || []

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