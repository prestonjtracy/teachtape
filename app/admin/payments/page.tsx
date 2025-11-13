import { createClient } from '@/lib/supabase/server'
import PaymentsTable from '@/components/admin/PaymentsTable'

export default async function PaymentsPage() {
  const supabase = createClient()
  
  // Try to get payments from dedicated payments table first
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      stripe_payment_intent_id,
      stripe_session_id,
      booking_id,
      booking_request_id,
      total_amount_cents,
      platform_fee_cents,
      coach_amount_cents,
      stripe_fee_cents,
      payment_status,
      payout_status,
      stripe_transfer_id,
      payout_date,
      payout_failed_reason,
      payout_retry_count,
      currency,
      description,
      customer_email,
      created_at,
      updated_at,
      coach:profiles!payments_coach_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      athlete:profiles!payments_athlete_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })

  // Fallback to bookings table if payments table doesn't exist or is empty
  let fallbackPayments = null
  if ((paymentsError && paymentsError.code === 'PGRST116') || (!paymentsError && (!payments || payments.length === 0))) {
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        stripe_session_id,
        amount_paid_cents,
        customer_email,
        status,
        created_at,
        coach:profiles!bookings_coach_id_fkey (
          id,
          full_name,
          avatar_url,
          stripe_account_id:coaches!coaches_profile_id_fkey (
            stripe_account_id
          )
        ),
        listing:listings!bookings_listing_id_fkey (
          id,
          title
        )
      `)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })

    if (!bookingsError) {
      fallbackPayments = bookingsData?.map(booking => ({
        id: booking.id,
        payment_id: booking.stripe_session_id || booking.id,
        athlete_name: 'Customer',
        athlete_email: booking.customer_email,
        athlete_avatar: null,
        coach_name: (booking.coach as any)?.[0]?.full_name || 'Unknown Coach',
        coach_avatar: (booking.coach as any)?.[0]?.avatar_url,
        coach_stripe_account: (booking.coach as any)?.[0]?.stripe_account_id?.[0]?.stripe_account_id,
        amount: booking.amount_paid_cents,
        platform_fee: Math.floor(booking.amount_paid_cents * 0.1), // 10% platform fee
        coach_amount: booking.amount_paid_cents - Math.floor(booking.amount_paid_cents * 0.1),
        payment_status: booking.status === 'paid' ? 'succeeded' : booking.status,
        payout_status: 'unknown' as const,
        date: booking.created_at,
        listing_title: (booking.listing as any)?.[0]?.title,
        source: 'bookings' as const,
        payout_failed_reason: null,
        payout_retry_count: 0,
        stripe_transfer_id: null
      })) || []
    }
  }

  // Transform dedicated payments data
  const transformedPayments = payments?.map(payment => ({
    id: payment.id,
    payment_id: payment.stripe_payment_intent_id || payment.stripe_session_id || payment.id,
    athlete_name: (payment.athlete as any)?.[0]?.full_name || 'Unknown Athlete',
    athlete_email: payment.customer_email,
    athlete_avatar: (payment.athlete as any)?.[0]?.avatar_url,
    coach_name: (payment.coach as any)?.[0]?.full_name || 'Unknown Coach',
    coach_avatar: (payment.coach as any)?.[0]?.avatar_url,
    coach_stripe_account: null, // Would need to join with coaches table
    amount: payment.total_amount_cents,
    platform_fee: payment.platform_fee_cents,
    coach_amount: payment.coach_amount_cents,
    payment_status: payment.payment_status,
    payout_status: payment.payout_status,
    payout_failed_reason: payment.payout_failed_reason,
    payout_retry_count: payment.payout_retry_count,
    stripe_transfer_id: payment.stripe_transfer_id,
    date: payment.created_at,
    listing_title: payment.description,
    source: 'payments' as const
  })) || []

  const allPayments = transformedPayments.length > 0 ? transformedPayments : fallbackPayments || []

  // Calculate summary stats
  const stats = {
    totalRevenue: allPayments.reduce((sum, p) => sum + p.amount, 0),
    totalPayouts: allPayments.reduce((sum, p) => sum + (p.coach_amount || 0), 0),
    totalFees: allPayments.reduce((sum, p) => sum + (p.platform_fee || 0), 0),
    totalTransactions: allPayments.length,
    successfulPayments: allPayments.filter(p => p.payment_status === 'succeeded').length,
    pendingPayouts: allPayments.filter(p => ['pending', 'in_transit'].includes(p.payout_status || '')).length,
    failedPayouts: allPayments.filter(p => p.payout_status === 'failed').length
  }

  if (paymentsError && paymentsError.code !== 'PGRST116') {
    console.error('Error fetching payments:', paymentsError)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">Payment Management</h1>
        <p className="text-gray-600 mt-2">Track transactions, payouts, and platform revenue</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-6 rounded-lg">
          <div className="text-3xl font-bold text-green-600">
            ${(stats.totalRevenue / 100).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Total Revenue</div>
          <div className="text-xs text-gray-500 mt-1">{stats.totalTransactions} transactions</div>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">
            ${(stats.totalPayouts / 100).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Coach Payouts</div>
          <div className="text-xs text-gray-500 mt-1">{stats.successfulPayments} successful</div>
        </div>
        
        <div className="bg-[#F25C1F] bg-opacity-10 p-6 rounded-lg">
          <div className="text-3xl font-bold text-[#F25C1F]">
            ${(stats.totalFees / 100).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Platform Fees</div>
          <div className="text-xs text-gray-500 mt-1">
            {((stats.totalFees / stats.totalRevenue) * 100 || 0).toFixed(1)}% average
          </div>
        </div>
        
        <div className="bg-yellow-50 p-6 rounded-lg">
          <div className="text-3xl font-bold text-yellow-600">{stats.pendingPayouts}</div>
          <div className="text-sm text-gray-600 mt-1">Pending Payouts</div>
          <div className="text-xs text-red-500 mt-1">{stats.failedPayouts} failed</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <PaymentsTable initialPayments={allPayments} />
      </div>
    </div>
  )
}