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
      profiles!profile_id (
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

  if (error) {
    console.error('Error fetching coaches:', error)
  }

  // Transform data to include service count
  const transformedCoaches = coaches?.map(coach => {
    // Handle profile data - it could be an object or array depending on the join
    const profile = Array.isArray(coach.profiles) ? coach.profiles[0] : coach.profiles

    return {
      id: coach.id,
      profile_id: coach.profile_id,
      full_name: (profile as any)?.full_name || 'No name set',
      sport: coach.sport,
      bio: (profile as any)?.bio,
      avatar_url: (profile as any)?.avatar_url,
      is_public: coach.is_public,
      stripe_connected: !!coach.stripe_account_id,
      stripe_account_id: coach.stripe_account_id,
      services_count: coach.services?.length || 0,
      created_at: coach.created_at,
      verified: !!coach.verified_at,
      verified_at: coach.verified_at
    }
  }) || []

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