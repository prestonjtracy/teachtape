import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import Stripe from 'stripe';

interface Booking {
  id: string;
  created_at: string;
  customer_email: string | null;
  amount_paid_cents: number;
  status: string;
  listing_id: string;
  stripe_session_id: string;
  listing?: {
    title: string;
  };
}

interface EarningsSummary {
  last7Days: number;
  monthToDate: number;
  allTime: number;
}

interface StripeAccountStatus {
  accountId: string | null;
  chargesEnabled: boolean;
  needsOnboarding: boolean;
}

export default async function DashboardPage() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/dashboard');
  }

  // Get user's profile and coach data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'coach') {
    // Non-coaches get a simple dashboard
    return <DashboardClient />;
  }

  // Get coach data including Stripe account
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, stripe_account_id')
    .eq('profile_id', profile.id)
    .single();

  // Fetch bookings for this coach
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      created_at,
      customer_email,
      amount_paid_cents,
      status,
      listing_id,
      stripe_session_id,
      listing:listings(title)
    `)
    .eq('coach_id', profile.id)
    .order('created_at', { ascending: false });

  // Calculate earnings summary
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidBookings = (bookings || []).filter(b => b.status === 'paid');
  
  const earningsSummary: EarningsSummary = {
    last7Days: paidBookings
      .filter(b => new Date(b.created_at) >= sevenDaysAgo)
      .reduce((sum, b) => sum + b.amount_paid_cents, 0),
    monthToDate: paidBookings
      .filter(b => new Date(b.created_at) >= monthStart)
      .reduce((sum, b) => sum + b.amount_paid_cents, 0),
    allTime: paidBookings
      .reduce((sum, b) => sum + b.amount_paid_cents, 0)
  };

  // Check Stripe account status
  let stripeAccountStatus: StripeAccountStatus = {
    accountId: coach?.stripe_account_id || null,
    chargesEnabled: false,
    needsOnboarding: false
  };

  if (coach?.stripe_account_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
      const account = await stripe.accounts.retrieve(coach.stripe_account_id);
      stripeAccountStatus.chargesEnabled = account.charges_enabled || false;
      stripeAccountStatus.needsOnboarding = !account.charges_enabled;
    } catch (error) {
      console.error('Failed to check Stripe account status:', error);
      stripeAccountStatus.needsOnboarding = true;
    }
  } else if (coach) {
    // Coach exists but no Stripe account ID
    stripeAccountStatus.needsOnboarding = true;
  }

  return (
    <DashboardClient
      coach={{
        id: profile.id, // Use profile.id as the coach_id for booking requests
        profile_id: profile.id,
        full_name: profile.full_name
      }}
      bookings={bookings as Booking[] || []}
      earningsSummary={earningsSummary}
      stripeAccountStatus={stripeAccountStatus}
    />
  );
}