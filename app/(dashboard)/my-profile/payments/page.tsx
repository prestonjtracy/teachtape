'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

interface StripeAccountDetails {
  hasAccount: boolean;
  needsOnboarding: boolean;
  chargesEnabled: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  accountId: string | null;
  details?: {
    email?: string;
    country?: string;
    defaultCurrency?: string;
    externalAccounts?: Array<{
      id: string;
      object: string;
      last4: string | null;
      bankName: string | null;
    }>;
  };
}

export default function PaymentsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stripeStatus, setStripeStatus] = useState<StripeAccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStripeStatus() {
      if (!user || !profile) return;

      if (profile.role !== 'coach') {
        router.push('/dashboard');
        return;
      }

      try {
        const response = await fetch('/api/stripe/account-status');
        if (response.ok) {
          const data = await response.json();
          setStripeStatus(data);
        } else {
          setError('Failed to load Stripe account status');
        }
      } catch (err) {
        console.error('Error fetching Stripe status:', err);
        setError('Failed to load payment settings');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchStripeStatus();
    }
  }, [user, profile, authLoading, router]);

  async function handleConnectStripe() {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start Stripe onboarding');
        setActionLoading(false);
      }
    } catch (err) {
      console.error('Error connecting Stripe:', err);
      setError('Failed to connect Stripe account');
      setActionLoading(false);
    }
  }

  async function handleOpenStripeDashboard() {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/dashboard-link', { method: 'POST' });
      const data = await response.json();

      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        setError(data.error || 'Failed to open Stripe dashboard');
      }
    } catch (err) {
      console.error('Error opening Stripe dashboard:', err);
      setError('Failed to open Stripe dashboard');
    } finally {
      setActionLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent mx-auto mb-4"></div>
          <p>Loading payment settings...</p>
        </div>
      </div>
    );
  }

  if (!stripeStatus) {
    return (
      <div className="min-h-screen bg-background-subtle flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load payment settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-subtle">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-text">Payment Settings</h1>
          <p className="text-neutral-text-secondary mt-2">
            Manage your Stripe account and payment information
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Stripe Account Status */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-semibold">Stripe Account Status</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    {stripeStatus.hasAccount
                      ? 'Stripe account connected'
                      : 'No Stripe account connected'}
                  </p>
                </div>
                <div>
                  {stripeStatus.hasAccount ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              {/* Payments Enabled */}
              {stripeStatus.hasAccount && (
                <>
                  <div className="border-t pt-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Payments Status</p>
                      <p className="text-sm text-gray-600">
                        {stripeStatus.chargesEnabled
                          ? 'Ready to receive payments'
                          : 'Setup incomplete - cannot receive payments'}
                      </p>
                    </div>
                    <div>
                      {stripeStatus.chargesEnabled ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Setup Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bank Account Info */}
                  {stripeStatus.details?.externalAccounts && stripeStatus.details.externalAccounts.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="font-medium mb-2">Bank Account</p>
                      {stripeStatus.details.externalAccounts.map((account) => (
                        <div key={account.id} className="flex items-center text-sm text-gray-600">
                          <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          {account.bankName || 'Bank'} •••• {account.last4}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Account Details */}
                  {stripeStatus.details && (
                    <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
                      {stripeStatus.details.email && (
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-gray-600">{stripeStatus.details.email}</p>
                        </div>
                      )}
                      {stripeStatus.details.country && (
                        <div>
                          <p className="font-medium">Country</p>
                          <p className="text-gray-600">{stripeStatus.details.country}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Actions</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {!stripeStatus.hasAccount || stripeStatus.needsOnboarding ? (
              <Button
                onClick={handleConnectStripe}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                {actionLoading ? 'Loading...' : stripeStatus.hasAccount ? 'Complete Stripe Setup' : 'Connect Stripe Account'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleOpenStripeDashboard}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? 'Opening...' : 'Open Stripe Dashboard'}
                </Button>
                <p className="text-sm text-gray-600">
                  Update your banking information, view payouts, and manage your Stripe account.
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
