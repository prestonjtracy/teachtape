import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/**
 * Get Stripe Connect account status for the authenticated coach
 *
 * Returns detailed information about:
 * - Whether charges are enabled
 * - Whether onboarding is complete
 * - Account details for display
 */
export async function GET() {
  try {
    // Require authentication
    const { user, error: authError } = await requireAuth()
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: authError.status })
    }

    const supabase = await createClient()

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can check Stripe status' }, { status: 403 })
    }

    // Get coach record with Stripe account ID
    const { data: coach } = await supabase
      .from('coaches')
      .select('id, stripe_account_id')
      .eq('profile_id', profile.id)
      .single()

    // If no Stripe account exists, return needs onboarding
    if (!coach?.stripe_account_id) {
      return NextResponse.json({
        hasAccount: false,
        needsOnboarding: true,
        chargesEnabled: false,
        accountId: null,
        details: null
      })
    }

    // Check actual Stripe account status
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(coach.stripe_account_id)

    // Determine if onboarding is complete
    const needsOnboarding = !account.charges_enabled || !account.details_submitted

    return NextResponse.json({
      hasAccount: true,
      needsOnboarding,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      accountId: account.id,
      details: {
        email: account.email,
        country: account.country,
        defaultCurrency: account.default_currency,
        // Include last 4 of bank account if available
        externalAccounts: account.external_accounts?.data.map(acct => ({
          id: acct.id,
          object: acct.object,
          last4: 'last4' in acct ? acct.last4 : null,
          bankName: 'bank_name' in acct ? acct.bank_name : null,
        })) || []
      }
    })

  } catch (error: any) {
    console.error('Error fetching Stripe account status:', error)

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        error: 'Stripe account not found or invalid',
        hasAccount: false,
        needsOnboarding: true
      }, { status: 200 }) // Return 200 so frontend knows to show onboarding
    }

    return NextResponse.json({
      error: 'Failed to fetch Stripe status',
      message: error.message
    }, { status: 500 })
  }
}
