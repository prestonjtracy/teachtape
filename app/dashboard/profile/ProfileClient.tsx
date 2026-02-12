'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  bio: string | null;
  sport: string | null;
}

interface Coach {
  id: string;
  stripe_account_id: string | null;
}

interface ProfileClientProps {
  profile: Profile | null;
  coach: Coach | null;
}

export default function ProfileClient({ profile, coach }: ProfileClientProps) {
  const [loading, setLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    accountId: string | null;
    chargesEnabled: boolean;
    loading: boolean;
  }>({
    accountId: coach?.stripe_account_id || null,
    chargesEnabled: false,
    loading: false
  });
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Check onboarding status from URL params
  useEffect(() => {
    const url = new URL(window.location.href);
    const onboard = url.searchParams.get('onboard');
    const acct = url.searchParams.get('acct');

    if (onboard === 'done' && acct) {
      setStripeStatus(prev => ({ ...prev, accountId: acct }));
      setToast({ 
        show: true, 
        message: 'Stripe account connected successfully! You can now receive payments.', 
        type: 'success' 
      });
      
      // Clean the URL
      url.searchParams.delete('onboard');
      url.searchParams.delete('acct');
      window.history.replaceState({}, '', url.toString());
    } else if (onboard === 'refresh') {
      setToast({ 
        show: true, 
        message: 'Please complete your Stripe setup to receive payments.', 
        type: 'error' 
      });
      
      // Clean the URL
      url.searchParams.delete('onboard');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Check Stripe account status on load
  useEffect(() => {
    async function checkStripeStatus() {
      if (!stripeStatus.accountId) return;

      setStripeStatus(prev => ({ ...prev, loading: true }));
      
      try {
        const response = await fetch('/api/stripe/connect', { method: 'POST' });
        const data = await response.json();
        
        if (response.ok && data.chargesEnabled !== undefined) {
          setStripeStatus(prev => ({ 
            ...prev, 
            chargesEnabled: data.chargesEnabled,
            loading: false 
          }));
        }
      } catch (error) {
        console.error('Failed to check Stripe status:', error);
      } finally {
        setStripeStatus(prev => ({ ...prev, loading: false }));
      }
    }

    checkStripeStatus();
  }, [stripeStatus.accountId]);

  async function handleConnectStripe() {
    setLoading(true);
    
    try {
      const response = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Stripe account');
      }

      if (data.chargesEnabled) {
        // Account is already set up
        setStripeStatus({
          accountId: data.accountId,
          chargesEnabled: true,
          loading: false
        });
        setToast({ 
          show: true, 
          message: 'Your Stripe account is already connected and ready to receive payments!', 
          type: 'success' 
        });
      } else if (data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        throw new Error('No onboarding URL returned');
      }
    } catch (error: any) {
      setToast({ 
        show: true, 
        message: `Error: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirmText !== 'DELETE') return;

    setDeleteLoading(true);
    try {
      const response = await fetch('/api/user/delete', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Redirect to login page with success message
      window.location.href = '/auth/login?message=Account+deleted+successfully';
    } catch (error: any) {
      setToast({
        show: true,
        message: error.message || 'Failed to delete account',
        type: 'error'
      });
      setDeleteLoading(false);
    }
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setConfirmText('');
  }

  if (!profile) {
    return (
      <div style={{ padding: 24 }}>
        <p>Profile not found. Please create your profile first.</p>
        <a href="/my-profile" style={{ color: '#007bff' }}>Go to My Profile</a>
      </div>
    );
  }

  const isCoach = profile.role === 'coach';
  const needsStripeSetup = isCoach && (!stripeStatus.accountId || !stripeStatus.chargesEnabled);

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <h1>Dashboard - Profile</h1>
      
      {/* Profile Summary */}
      <div style={{ 
        marginBottom: 32, 
        padding: 24, 
        backgroundColor: '#f8f9fa', 
        borderRadius: 8 
      }}>
        <h2>Profile Summary</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><strong>Name:</strong> {profile.full_name || 'Not set'}</div>
          <div><strong>Role:</strong> {profile.role}</div>
          <div><strong>Sport:</strong> {profile.sport || 'Not set'}</div>
          {profile.bio && <div><strong>Bio:</strong> {profile.bio}</div>}
        </div>
        
        <div style={{ marginTop: 16 }}>
          <a 
            href="/my-profile" 
            style={{ 
              color: '#007bff', 
              textDecoration: 'none',
              padding: '8px 16px',
              border: '1px solid #007bff',
              borderRadius: 4,
              display: 'inline-block'
            }}
          >
            Edit Profile
          </a>
        </div>
      </div>

      {/* Stripe Connect Section - Only for Coaches */}
      {isCoach && (
        <div style={{ 
          marginBottom: 32, 
          padding: 24, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8 
        }}>
          <h2>Payment Setup</h2>
          
          {stripeStatus.loading ? (
            <div>Checking Stripe account status...</div>
          ) : stripeStatus.accountId && stripeStatus.chargesEnabled ? (
            <div>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#d4edda', 
                color: '#155724', 
                borderRadius: 4,
                marginBottom: 16
              }}>
                ✅ Your Stripe account is connected and ready to receive payments!
              </div>
              <div style={{ fontSize: 14, color: '#666' }}>
                Account ID: <code>{stripeStatus.accountId}</code>
              </div>
            </div>
          ) : (
            <div>
              {stripeStatus.accountId ? (
                <div style={{ 
                  padding: 12, 
                  backgroundColor: '#fff3cd', 
                  color: '#856404', 
                  borderRadius: 4,
                  marginBottom: 16
                }}>
                  ⚠️ Your Stripe account setup is incomplete. Complete setup to receive payments.
                </div>
              ) : (
                <div style={{ 
                  padding: 12, 
                  backgroundColor: '#f8d7da', 
                  color: '#721c24', 
                  borderRadius: 4,
                  marginBottom: 16
                }}>
                  ❌ Connect your Stripe account to receive payments for your coaching sessions.
                </div>
              )}
              
              <button
                onClick={handleConnectStripe}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6772e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Connecting...' : 'Connect with Stripe'}
              </button>
              
              <div style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
                Stripe handles secure payment processing for your coaching sessions.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div style={{
        padding: 24,
        backgroundColor: '#f8f9fa',
        borderRadius: 8
      }}>
        <h2>Quick Links</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a href="/my-profile" style={{ color: '#007bff' }}>→ Edit Profile</a>
          {isCoach && <a href="/my-listings" style={{ color: '#007bff' }}>→ Manage Listings</a>}
          <a href="/dashboard" style={{ color: '#007bff' }}>→ Back to Dashboard</a>
        </div>
      </div>

      {/* Danger Zone - Delete Account */}
      {profile.role !== 'admin' && (
        <div style={{
          marginTop: 32,
          padding: 24,
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          border: '1px solid #fecaca'
        }}>
          <h2 style={{ color: '#991b1b', marginBottom: 8 }}>Danger Zone</h2>
          <p style={{ color: '#7f1d1d', marginBottom: 16, fontSize: 14 }}>
            Once you delete your account, there is no going back. Your profile will be deactivated
            and you will no longer be able to access your account. Your reviews will show as
            &quot;Former User&quot;.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Delete My Account
          </button>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            maxWidth: 400,
            width: '100%',
            padding: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#dc2626' }}>Delete Account</h3>
              <button
                onClick={closeDeleteModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{
              padding: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              marginBottom: 16
            }}>
              <p style={{ color: '#991b1b', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                Warning: This action cannot be undone
              </p>
              <ul style={{ color: '#7f1d1d', fontSize: 13, paddingLeft: 20, margin: 0 }}>
                <li>Your account will be permanently deactivated</li>
                <li>You will not be able to log in</li>
                <li>Your reviews will display &quot;Former User&quot;</li>
                <li>Your data will be retained for record-keeping</li>
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#374151' }}>
                Type <span style={{ fontWeight: 700 }}>DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
                disabled={deleteLoading}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || confirmText !== 'DELETE'}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: confirmText === 'DELETE' ? '#dc2626' : '#f87171',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: (deleteLoading || confirmText !== 'DELETE') ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  opacity: (deleteLoading || confirmText !== 'DELETE') ? 0.6 : 1
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast 
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </main>
  );
}