'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import CoachDashboard from "@/components/dashboard/CoachDashboard";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

interface Booking {
  id: string;
  created_at: string;
  customer_email: string | null;
  amount_paid_cents: number;
  status: string;
  listing_id: string;
  stripe_session_id: string;
  starts_at?: string | null;
  ends_at?: string | null;
  conversation_id?: string | null;
  listing?: {
    title: string;
    duration_minutes?: number;
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

interface Coach {
  id: string;
  profile_id: string;
  full_name: string | null;
}

interface DashboardClientProps {
  coach?: Coach;
  bookings?: Booking[];
  earningsSummary?: EarningsSummary;
  stripeAccountStatus?: StripeAccountStatus;
}

export default function DashboardClient() {
  const { user, profile, loading: authLoading } = useAuth();
  const [coachBookings, setCoachBookings] = useState<Booking[]>([]);
  const [coachEarnings, setCoachEarnings] = useState<EarningsSummary>({ last7Days: 0, monthToDate: 0, allTime: 0 });
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus>({ accountId: null, chargesEnabled: false, needsOnboarding: true });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCoachData() {
      if (!profile || profile.role !== 'coach') return;

      setDashboardLoading(true);
      try {
        console.log('🔍 [Dashboard] Fetching coach data via API...');

        // Use server-side API to fetch coach data (bypasses RLS issues)
        const coachDataResponse = await fetch('/api/dashboard/coach-data', {
          credentials: 'include'
        });

        if (coachDataResponse.ok) {
          const coachData = await coachDataResponse.json();
          console.log('✅ [Dashboard] Coach data fetched:', coachData);

          setCoachBookings(coachData.bookings || []);
          setCoachEarnings(coachData.earnings || { last7Days: 0, monthToDate: 0, allTime: 0 });

          // Fetch Stripe status separately
          try {
            const stripeStatusResponse = await fetch('/api/stripe/account-status', {
              credentials: 'include'
            });
            if (stripeStatusResponse.ok) {
              const stripeData = await stripeStatusResponse.json();
              setStripeStatus({
                accountId: stripeData.accountId,
                chargesEnabled: stripeData.chargesEnabled,
                needsOnboarding: stripeData.needsOnboarding
              });
            } else {
              // Fallback
              setStripeStatus({
                accountId: coachData.coach?.stripe_account_id || null,
                chargesEnabled: false,
                needsOnboarding: true
              });
            }
          } catch (stripeError) {
            console.error('Error fetching Stripe status:', stripeError);
            setStripeStatus({
              accountId: coachData.coach?.stripe_account_id || null,
              chargesEnabled: false,
              needsOnboarding: true
            });
          }
        } else {
          console.error('❌ [Dashboard] Coach data API error:', coachDataResponse.status);
        }
      } catch (error) {
        console.error('❌ [Dashboard] Error fetching coach data:', error);
      } finally {
        setDashboardLoading(false);
      }
    }

    if (!authLoading && user && profile) {
      fetchCoachData();
    }
  }, [user, profile, authLoading]);

  if (authLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show coach dashboard if user is a coach
  if (profile?.role === 'coach') {
    return (
      <CoachDashboard
        coach={{
          id: profile.id,
          profile_id: profile.id,
          full_name: profile.full_name || null
        }}
        bookings={coachBookings}
        earningsSummary={coachEarnings}
        stripeAccountStatus={stripeStatus}
      />
    );
  }
  
  // Redirect non-coaches to the athlete dashboard
  if (profile && profile.role !== 'coach') {
    // Use Next.js redirect on the client side
    if (typeof window !== 'undefined') {
      window.location.href = '/athlete-dashboard';
    }
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent mx-auto mb-4"></div>
          <p>Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // If we reach here, there's an error - user should have a profile
  console.log('🚨 [Dashboard] Fallback case reached. User:', user ? 'exists' : 'null', 'Profile:', profile);
  
  // If no user, redirect to login
  if (!user) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-text mb-4">Please sign in</h1>
          <p className="text-neutral-text-secondary mb-6">
            You need to be signed in to access the dashboard.
          </p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // If no profile, show profile setup with retry option
  const handleRetryProfile = async () => {
    console.log('🔄 [Dashboard] Manually retrying profile fetch...');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', currentUser.id)
          .single();

        if (profileData) {
          console.log('✅ [Dashboard] Profile found on retry:', profileData);
          window.location.reload();
        } else {
          console.log('❌ [Dashboard] Profile still not found:', error);
          alert('Profile not found. Please complete your profile setup.');
        }
      }
    } catch (err) {
      console.error('❌ [Dashboard] Retry failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background-subtle flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-neutral-text mb-4">Complete Your Profile</h1>
        <p className="text-neutral-text-secondary mb-6">
          Please complete your profile setup to access the dashboard.
        </p>
        <div className="text-sm text-gray-500 mb-4 p-3 bg-gray-100 rounded-lg">
          <p><strong>Debug Info:</strong></p>
          <p>User: {user ? 'authenticated' : 'not found'}</p>
          <p>User ID: {user?.id?.slice(0, 8)}...</p>
          <p>Email: {user?.email}</p>
          <p>Profile: {profile ? `role: ${profile.role}` : 'not found'}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/my-profile">Complete Profile Setup</Link>
          </Button>
          <Button variant="outline" onClick={handleRetryProfile}>
            Retry Loading Profile
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/api/debug/profile-check" target="_blank">
              Run Profile Diagnostics
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}