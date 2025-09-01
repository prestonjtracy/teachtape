import Stripe from 'stripe';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface SuccessPageProps {
  searchParams: {
    session_id?: string;
  };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect('/coaches?error=no-session');
  }

  // Initialize Stripe
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>Configuration Error</h1>
        <p style={{ color: '#dc3545' }}>Payment system not configured</p>
        <Link href="/coaches" style={{ color: '#007bff' }}>
          Return to Coaches
        </Link>
      </main>
    );
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  let sessionData: Stripe.Checkout.Session | null = null;
  let coachName = 'Coach';
  let listingTitle = 'Coaching Session';

  try {
    // Retrieve the session with expanded data
    sessionData = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer_details']
    });

    // Get coach and listing details from metadata
    if (sessionData.metadata) {
      const supabase = createClient();
      
      // Get coach name
      if (sessionData.metadata.coach_id) {
        const { data: coach } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', sessionData.metadata.coach_id)
          .single();
        
        if (coach?.full_name) {
          coachName = coach.full_name;
        }
      }

      // Get listing title
      if (sessionData.metadata.listing_id) {
        const { data: listing } = await supabase
          .from('listings')
          .select('title')
          .eq('id', sessionData.metadata.listing_id)
          .single();
        
        if (listing?.title) {
          listingTitle = listing.title;
        }
      }
    }
  } catch (error) {
    console.error('Error retrieving session:', error);
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>Session Not Found</h1>
        <p style={{ color: '#dc3545' }}>
          Unable to find your booking details. Your payment may still have been processed.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link 
            href="/coaches" 
            style={{ 
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 6
            }}
          >
            Return to Coaches
          </Link>
        </div>
      </main>
    );
  }

  // Format currency
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <main style={{ padding: 24, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ 
        backgroundColor: '#d4edda', 
        color: '#155724', 
        padding: 24, 
        borderRadius: 8,
        marginBottom: 24
      }}>
        <h1 style={{ margin: '0 0 16px 0' }}>🎉 Payment Successful!</h1>
        <p style={{ margin: 0, fontSize: 18 }}>
          Your coaching session with {coachName} has been booked successfully.
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: 20, 
        borderRadius: 8,
        marginBottom: 24,
        textAlign: 'left'
      }}>
        <h3>Booking Details</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <div><strong>Session:</strong> {listingTitle}</div>
          <div><strong>Coach:</strong> {coachName}</div>
          <div><strong>Amount Paid:</strong> {formatCurrency(sessionData.amount_total || 0)}</div>
          <div><strong>Payment Status:</strong> <span style={{ color: '#28a745' }}>Paid</span></div>
          {sessionData.customer_details?.email && (
            <div><strong>Email:</strong> {sessionData.customer_details.email}</div>
          )}
          <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
            <strong>Session ID:</strong> {sessionData.id}
          </div>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#e7f3ff', 
        padding: 20, 
        borderRadius: 8,
        marginBottom: 24
      }}>
        <h3>What's Next?</h3>
        <ul style={{ textAlign: 'left', paddingLeft: 20 }}>
          <li>You'll receive a confirmation email at {sessionData.customer_details?.email || 'your email address'}</li>
          <li>{coachName} will contact you to schedule the session</li>
          <li>Check your email for session details and meeting links</li>
          <li>If you have questions, reach out to {coachName} directly</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link 
          href="/coaches"
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 6,
            display: 'inline-block'
          }}
        >
          Browse More Coaches
        </Link>
        <Link 
          href="/"
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 6,
            display: 'inline-block'
          }}
        >
          Back to Home
        </Link>
      </div>

      <div style={{ 
        marginTop: 32, 
        padding: 16, 
        backgroundColor: '#f8f9fa', 
        borderRadius: 8,
        fontSize: 14,
        color: '#666'
      }}>
        <p style={{ margin: 0 }}>
          <strong>Need help?</strong> If you have any questions about your booking or need to make changes, 
          please contact {coachName} or reach out to our support team.
        </p>
      </div>
    </main>
  );
}