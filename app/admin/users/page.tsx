import { createClient, createAdminClient } from '@/lib/supabase/server'
import UsersTable from '@/components/admin/UsersTable'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = createClient()
  const adminSupabase = createAdminClient()
  
  // Get users with their profiles
  const { data: users, error } = await supabase
    .from('profiles')
    .select(`
      id,
      auth_user_id,
      full_name,
      role,
      created_at
    `)
    .order('created_at', { ascending: false })

  // Get auth users to get email and last_sign_in_at using admin client
  const { data: authData } = await adminSupabase.auth.admin.listUsers()

  // Merge the data
  const mergedUsers = users?.map(profile => {
    const authUser = authData?.users.find(au => au.id === profile.auth_user_id)
    return {
      ...profile,
      email: authUser?.email || 'N/A',
      last_sign_in_at: authUser?.last_sign_in_at || null,
      email_confirmed_at: authUser?.email_confirmed_at || null
    }
  }) || []

  if (error) {
    console.error('Error fetching users:', error)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">User Management</h1>
        <p className="text-gray-600 mt-2">Manage users, roles, and permissions</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <UsersTable initialUsers={mergedUsers} />
      </div>
    </div>
  )
}