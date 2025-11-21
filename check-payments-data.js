// Quick diagnostic script to check payment data
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkData() {
  console.log('\n=== CHECKING BOOKINGS TABLE ===\n')

  // Check all bookings
  const { data: allBookings, error: allError } = await supabase
    .from('bookings')
    .select('id, status, amount_paid_cents, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (allError) {
    console.error('Error fetching all bookings:', allError)
  } else {
    console.log(`Total bookings found: ${allBookings?.length || 0}`)
    if (allBookings && allBookings.length > 0) {
      console.log('\nBookings:')
      allBookings.forEach(b => {
        console.log(`  - ID: ${b.id.slice(0, 8)}... Status: ${b.status}, Amount: $${(b.amount_paid_cents / 100).toFixed(2)}, Date: ${b.created_at}`)
      })
    }
  }

  // Check bookings with amount > 0
  const { data: paidBookings, error: paidError } = await supabase
    .from('bookings')
    .select('id, status, amount_paid_cents')
    .gt('amount_paid_cents', 0)

  if (paidError) {
    console.error('\nError fetching paid bookings:', paidError)
  } else {
    console.log(`\nBookings with amount > 0: ${paidBookings?.length || 0}`)
  }

  // Check payments table
  console.log('\n=== CHECKING PAYMENTS TABLE ===\n')
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, payment_status, total_amount_cents')
    .limit(10)

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError)
  } else {
    console.log(`Total payments found: ${payments?.length || 0}`)
  }
}

checkData().then(() => {
  console.log('\n✅ Check complete')
  process.exit(0)
}).catch(err => {
  console.error('\n❌ Error:', err)
  process.exit(1)
})
