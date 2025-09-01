'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [acct, setAcct] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // On load: pick up acct from URL OR from localStorage
  useEffect(() => {
    const url = new URL(window.location.href);
    const acctFromUrl = url.searchParams.get('acct');

    if (acctFromUrl) {
      localStorage.setItem('coachAcctId', acctFromUrl);
      setAcct(acctFromUrl);
      // clean the URL so the message disappears after first save
      url.searchParams.delete('acct');
      window.history.replaceState({}, '', url.toString());
    } else {
      const saved = localStorage.getItem('coachAcctId');
      if (saved) setAcct(saved);
    }
  }, []);

  async function connectStripe() {
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/connect-onboard', { method: 'POST' });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url; // go do onboarding
      } else {
        alert('Could not get onboarding URL');
      }
    } finally {
      setLoading(false);
    }
  }

  async function bookTest() {
    if (!acct) {
      alert("No connected coach account yet. Click 'Connect Stripe (Coach)' first.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: 'test-booking-ui',
          amount: 500, // $5.00 in cents
          coachStripeAccountId: acct,
        }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url; // Stripe Checkout
      } else {
        alert('Checkout link not returned');
        console.log('Checkout response:', data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <ul>
        <li>My profile(s)</li>
        <li>My listings</li>
        <li>Availability</li>
        <li>Bookings</li>
        <li>Messages</li>
      </ul>

      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <button onClick={connectStripe} disabled={loading} style={{ padding: '8px 14px' }}>
          {loading ? 'Loading…' : 'Connect Stripe (Coach)'}
        </button>

        <button onClick={bookTest} disabled={loading} style={{ padding: '8px 14px' }}>
          {loading ? 'Loading…' : 'Book test $5 session (Athlete)'}
        </button>
      </div>

      <p style={{ marginTop: 12 }}>
        {acct ? (
          <>Connected coach account: <code>{acct}</code></>
        ) : (
          <>No connected coach account saved yet.</>
        )}
      </p>
    </main>
  );
}
