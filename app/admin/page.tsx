import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Check authentication and admin role
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  // Use admin client to fetch stats
  const adminSupabase = createAdminClient()

  // Fetch stats in parallel
  const [
    { count: totalUsers },
    { count: activeCoaches },
    { count: totalBookings },
    { data: bookingsForRevenue }
  ] = await Promise.all([
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
    adminSupabase.from('coaches').select('*', { count: 'exact', head: true }),
    adminSupabase.from('bookings').select('*', { count: 'exact', head: true }),
    adminSupabase.from('bookings').select('amount_paid_cents').gt('amount_paid_cents', 0)
  ])

  // Calculate total revenue
  const totalRevenue = bookingsForRevenue?.reduce((sum, booking) => sum + (booking.amount_paid_cents || 0), 0) || 0

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to the TeachTape admin panel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{totalUsers || 0}</p>
          <p className="text-sm text-gray-500 mt-1">All registered users</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Coaches</h3>
          <p className="text-3xl font-bold text-green-600">{activeCoaches || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Verified coaches</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Bookings</h3>
          <p className="text-3xl font-bold text-purple-600">{totalBookings || 0}</p>
          <p className="text-sm text-gray-500 mt-1">All time bookings</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue</h3>
          <p className="text-3xl font-bold text-orange-600">${(totalRevenue / 100).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Total platform revenue</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-2">Manage Users</h3>
            <p className="text-sm text-gray-600">View and manage user accounts</p>
          </button>
          
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-2">Review Coaches</h3>
            <p className="text-sm text-gray-600">Verify and approve coach applications</p>
          </button>
          
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-2">Platform Settings</h3>
            <p className="text-sm text-gray-600">Configure platform settings</p>
          </button>
        </div>
      </div>
    </div>
  )
}