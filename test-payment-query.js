// Test the exact query used in the payment page
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testQuery() {
  console.log('\n=== TESTING PAYMENT PAGE QUERY ===\n')

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      stripe_session_id,
      stripe_payment_intent,
      amount_paid_cents,
      customer_email,
      athlete_email,
      athlete_name,
      status,
      created_at,
      athlete_id,
      coach_id,
      listing_id,
      coach:coach_id(
        id,
        full_name,
        avatar_url
      ),
      athlete:athlete_id(
        id,
        full_name,
        avatar_url
      ),
      listing:listing_id(
        id,
        title
      )
    `)
    .gt('amount_paid_cents', 0)
    .order('created_at', { ascending: false })

  console.log('Query result:')
  console.log('  Error:', bookingsError)
  console.log('  Count:', bookingsData?.length || 0)

  if (bookingsData && bookingsData.length > 0) {
    console.log('\nFirst booking sample:')
    console.log(JSON.stringify(bookingsData[0], null, 2))
  }
}

testQuery().then(() => {
  console.log('\n✅ Test complete')
  process.exit(0)
}).catch(err => {
  console.error('\n❌ Error:', err)
  process.exit(1)
})
