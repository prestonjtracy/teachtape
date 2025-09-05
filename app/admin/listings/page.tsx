import { createClient } from '@/lib/supabase/server'
import ListingsTable from '@/components/admin/ListingsTable'

export default async function ListingsPage() {
  const supabase = createClient()
  
  // Get services (newer structure) with coach profile data
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select(`
      id,
      coach_id,
      title,
      description,
      duration_minutes,
      price_cents,
      currency,
      active,
      created_at,
      coach:coaches!services_coach_id_fkey (
        id,
        sport,
        profile:profiles!coaches_profile_id_fkey (
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .order('created_at', { ascending: false })

  // Get legacy listings with profile data
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select(`
      id,
      coach_id,
      title,
      description,
      duration_minutes,
      price_cents,
      is_active,
      created_at,
      coach:profiles!listings_coach_id_fkey (
        id,
        full_name,
        avatar_url,
        sport
      )
    `)
    .order('created_at', { ascending: false })

  // Transform services to consistent format
  const transformedServices = services?.map(service => ({
    id: service.id,
    title: service.title,
    description: service.description,
    duration_minutes: service.duration_minutes,
    price_cents: service.price_cents,
    is_active: service.active,
    created_at: service.created_at,
    coach_name: service.coach?.profile?.full_name || 'Unknown Coach',
    coach_avatar: service.coach?.profile?.avatar_url,
    sport: service.coach?.sport,
    table_type: 'services' as const
  })) || []

  // Transform listings to consistent format
  const transformedListings = listings?.map(listing => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    duration_minutes: listing.duration_minutes,
    price_cents: listing.price_cents,
    is_active: listing.is_active,
    created_at: listing.created_at,
    coach_name: listing.coach?.full_name || 'Unknown Coach',
    coach_avatar: listing.coach?.avatar_url,
    sport: listing.coach?.sport,
    table_type: 'listings' as const
  })) || []

  // Combine both data sources
  const allListings = [
    ...transformedServices,
    ...transformedListings
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Get unique coaches and sports for filters
  const coaches = Array.from(new Set(allListings.map(l => l.coach_name)))
    .filter(name => name !== 'Unknown Coach')
    .sort()
    
  const sports = Array.from(new Set(allListings.map(l => l.sport)))
    .filter(sport => sport)
    .sort()

  if (servicesError || listingsError) {
    console.error('Error fetching listings:', { servicesError, listingsError })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">Listing Management</h1>
        <p className="text-gray-600 mt-2">Manage lesson listings, services, and availability</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <ListingsTable 
          initialListings={allListings} 
          coaches={coaches}
          sports={sports}
        />
      </div>
    </div>
  )
}