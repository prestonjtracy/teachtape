import { createClient, createAdminClient } from '@/lib/supabase/server'
import CoachesTable from '@/components/admin/CoachesTable'

export default async function CoachesPage() {
  const supabase = createClient()
  
  // Get coaches with their profile data and services count
  const { data: coaches, error } = await supabase
    .from('coaches')
    .select(`
      id,
      profile_id,
      sport,
      is_public,
      stripe_account_id,
      verified_at,
      created_at,
      profile:profiles!coaches_profile_id_fkey (
        id,
        full_name,
        avatar_url,
        bio,
        role
      ),
      services (
        id
      )
    `)
    .order('created_at', { ascending: false })

  // Transform data to include service count
  const transformedCoaches = coaches?.map(coach => ({
    id: coach.id,
    profile_id: coach.profile_id,
    full_name: coach.profile?.full_name || 'No name set',
    sport: coach.sport,
    bio: coach.profile?.bio,
    avatar_url: coach.profile?.avatar_url,
    is_public: coach.is_public,
    stripe_connected: !!coach.stripe_account_id,
    stripe_account_id: coach.stripe_account_id,
    services_count: coach.services?.length || 0,
    created_at: coach.created_at,
    verified: !!coach.verified_at, // Use verified_at field if available, fallback to is_public
    verified_at: coach.verified_at
  })) || []

  if (error) {
    console.error('Error fetching coaches:', error)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">Coach Management</h1>
        <p className="text-gray-600 mt-2">Manage coaches, verification status, and platform access</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <CoachesTable initialCoaches={transformedCoaches} />
      </div>
    </div>
  )
}