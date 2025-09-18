'use client';

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import BookingRequestsList from "@/components/dashboard/BookingRequestsList";

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

interface CoachDashboardProps {
  coach: Coach;
  bookings: Booking[];
  earningsSummary: EarningsSummary;
  stripeAccountStatus: StripeAccountStatus;
}

export default function CoachDashboard({ 
  coach, 
  bookings = [], 
  earningsSummary, 
  stripeAccountStatus 
}: CoachDashboardProps) {
  
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString();

  async function continueOnboarding() {
    try {
      const response = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to get onboarding URL');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Failed to continue onboarding');
    }
  }

  return (
    <div className="min-h-screen bg-background-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-text">Coach Dashboard</h1>
          <p className="text-neutral-text-secondary mt-2">
            Welcome back, {coach.full_name || 'Coach'}!
          </p>
        </div>

        {/* Stripe Onboarding Banner */}
        {stripeAccountStatus?.needsOnboarding && (
          <div 
            className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-brand mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            data-testid="stripe-onboarding-banner"
          >
            <div>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <strong>Complete your Stripe setup</strong>
              </div>
              <p className="text-sm mt-1">
                Finish connecting your Stripe account to receive payments for your coaching sessions.
              </p>
            </div>
            <Button onClick={continueOnboarding} className="whitespace-nowrap">
              Continue Onboarding
            </Button>
          </div>
        )}

        {/* Earnings Summary */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-text mb-4">Earnings Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="earnings-kpi-cards">
            <Card className="text-center" data-testid="last-7-days-card">
              <CardBody className="p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatCurrency(earningsSummary.last7Days)}
                </div>
                <div className="text-neutral-text-muted text-sm">Last 7 Days</div>
              </CardBody>
            </Card>
            
            <Card className="text-center" data-testid="month-to-date-card">
              <CardBody className="p-6">
                <div className="text-3xl font-bold text-brand-primary mb-2">
                  {formatCurrency(earningsSummary.monthToDate)}
                </div>
                <div className="text-neutral-text-muted text-sm">Month to Date</div>
              </CardBody>
            </Card>
            
            <Card className="text-center" data-testid="all-time-card">
              <CardBody className="p-6">
                <div className="text-3xl font-bold text-brand-secondary mb-2">
                  {formatCurrency(earningsSummary.allTime)}
                </div>
                <div className="text-neutral-text-muted text-sm">All Time</div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-text mb-4">Recent Bookings</h2>
          
          {bookings.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 110-4 2 2 0 010 4zm0 0v3m-4-3a4 4 0 108 0v-3m-4-3V9" />
                </svg>
              }
              title="No bookings yet"
              description="Share your coach profile to start getting bookings!"
              action={
                <Button asChild>
                  <Link href="/my-listings">Manage My Listings</Link>
                </Button>
              }
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-background-subtle border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-text">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-text">Service</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-text">Customer Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-text">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-text">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.slice(0, 10).map((booking) => (
                      <tr key={booking.id} className="hover:bg-background-subtle/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-text-secondary">
                          {formatDateTime(booking.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-text">
                          {booking.listing?.title || 'Coaching Session'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-text-secondary">
                          {booking.customer_email || 'No email'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-text">
                          {formatCurrency(booking.amount_paid_cents)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={booking.status === 'paid' ? 'success' : 'error'}>
                            {booking.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {bookings.length > 10 && (
                  <div className="px-4 py-3 text-center border-t border-gray-200 bg-background-subtle">
                    <span className="text-sm text-neutral-text-muted">
                      Showing 10 of {bookings.length} bookings
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Booking Requests (for coaches) */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-text mb-4">Pending Requests</h2>
          
          <BookingRequestsList 
            coachId={coach.id}
            onRequestUpdate={() => {
              // You can add any additional refresh logic here if needed
              console.log('Request updated, dashboard notified');
            }}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-semibold text-neutral-text mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-brand-md transition-shadow group h-full">
              <CardBody className="p-6 text-center flex flex-col h-full">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.476L3 21l1.476-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-text mb-2">Messages</h3>
                <p className="text-sm text-neutral-text-muted mb-4 flex-grow">View conversations with athletes</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/messages">View</Link>
                </Button>
              </CardBody>
            </Card>

            <Card className="hover:shadow-brand-md transition-shadow group h-full">
              <CardBody className="p-6 text-center flex flex-col h-full">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-primary/20 transition-colors">
                  <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-text mb-2">Profile & Payments</h3>
                <p className="text-sm text-neutral-text-muted mb-4 flex-grow">Manage your profile and Stripe account</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/profile">Manage</Link>
                </Button>
              </CardBody>
            </Card>

            <Card className="hover:shadow-brand-md transition-shadow group h-full">
              <CardBody className="p-6 text-center flex flex-col h-full">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-primary/20 transition-colors">
                  <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-text mb-2">Manage Listings</h3>
                <p className="text-sm text-neutral-text-muted mb-4 flex-grow">Add, edit, or remove your coaching sessions</p>
                <Button asChild className="w-full">
                  <Link href="/my-listings">Manage</Link>
                </Button>
              </CardBody>
            </Card>

            <Card className="hover:shadow-brand-md transition-shadow group h-full">
              <CardBody className="p-6 text-center flex flex-col h-full">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-primary/20 transition-colors">
                  <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-neutral-text mb-2">Edit Profile</h3>
                <p className="text-sm text-neutral-text-muted mb-4 flex-grow">Update your bio, sport, and contact info</p>
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/my-profile">Edit</Link>
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}