import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/**
 * Generate a Stripe Express Dashboard link for the authenticated coach
 *
 * This allows coaches to:
 * - Update banking information
 * - View payouts
 * - Update tax information
 * - Manage their Stripe account
 */
export async function POST() {
  try {
    // Require authentication
    const { user, error: authError } = await requireAuth()
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: authError.status })
    }

    const supabase = createClient()

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can access Stripe dashboard' }, { status: 403 })
    }

    // Get coach record with Stripe account ID
    const { data: coach } = await supabase
      .from('coaches')
      .select('id, stripe_account_id')
      .eq('profile_id', profile.id)
      .single()

    if (!coach?.stripe_account_id) {
      return NextResponse.json({ error: 'No Stripe account found' }, { status: 404 })
    }

    // Initialize Stripe
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })

    // Create a login link to the Stripe Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(coach.stripe_account_id)

    return NextResponse.json({
      url: loginLink.url,
      message: 'Stripe dashboard link generated'
    })

  } catch (error: any) {
    console.error('Error generating Stripe dashboard link:', error)

    return NextResponse.json({
      error: 'Failed to generate dashboard link',
      message: error.message
    }, { status: 500 })
  }
}
