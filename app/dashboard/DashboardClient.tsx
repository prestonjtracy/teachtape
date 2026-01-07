'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
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
        console.log('🔍 [Dashboard] Fetching coach-specific data...');
        
        // Get coach data
        const { data: coach } = await supabase
          .from('coaches')
          .select('id, stripe_account_id')
          .eq('profile_id', profile.id)
          .single();

        // Fetch bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            created_at,
            customer_email,
            amount_paid_cents,
            status,
            listing_id,
            stripe_session_id,
            starts_at,
            ends_at,
            listing:listings(title)
          `)
          .eq('coach_id', profile.id)
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('❌ [Dashboard] Failed to fetch bookings:', bookingsError);
        }

        if (bookingsData) {
          console.log('✅ [Dashboard] Fetched bookings:', bookingsData.length);
          setCoachBookings(bookingsData as unknown as Booking[]);
          
          // Calculate earnings
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const paidBookings = bookingsData.filter((b: any) => b.status === 'paid');
          
          setCoachEarnings({
            last7Days: paidBookings
              .filter((b: any) => new Date(b.created_at) >= sevenDaysAgo)
              .reduce((sum: number, b: any) => sum + b.amount_paid_cents, 0),
            monthToDate: paidBookings
              .filter((b: any) => new Date(b.created_at) >= monthStart)
              .reduce((sum: number, b: any) => sum + b.amount_paid_cents, 0),
            allTime: paidBookings
              .reduce((sum: number, b: any) => sum + b.amount_paid_cents, 0)
          });
        }

        // Fetch real Stripe account status from API
        try {
          const stripeStatusResponse = await fetch('/api/stripe/account-status');
          if (stripeStatusResponse.ok) {
            const stripeData = await stripeStatusResponse.json();
            setStripeStatus({
              accountId: stripeData.accountId,
              chargesEnabled: stripeData.chargesEnabled,
              needsOnboarding: stripeData.needsOnboarding
            });
          } else {
            // Fallback to basic check if API fails
            setStripeStatus({
              accountId: coach?.stripe_account_id || null,
              chargesEnabled: false,
              needsOnboarding: true
            });
          }
        } catch (error) {
          console.error('Error fetching Stripe status:', error);
          // Fallback
          setStripeStatus({
            accountId: coach?.stripe_account_id || null,
            chargesEnabled: false,
            needsOnboarding: true
          });
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
  
  // Simple dashboard for non-coaches (students/users)
  if (profile && profile.role !== 'coach') {
    return (
      <div className="min-h-screen bg-background-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-neutral-text mb-8">Dashboard</h1>
          <div className="mb-8">
            <p className="text-neutral-text-secondary">
              Welcome back, {profile.full_name || user?.email}!
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-neutral-text">Quick Links</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/my-profile">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/coaches">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Browse Coaches
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/messages">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.476L3 21l1.476-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                    </svg>
                    Messages
                  </Link>
                </Button>
              </CardBody>
            </Card>
          </div>
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