import Stripe from 'stripe';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface SuccessPageProps {
  searchParams: {
    session_id?: string;
    dev?: string;
  };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const sessionId = searchParams.session_id;
  const isDev = searchParams.dev === 'true' || sessionId?.startsWith('dev_session_');

  if (!sessionId) {
    redirect('/coaches?error=no-session');
  }

  // Handle development mode
  if (isDev) {
    return (
      <main className="min-h-screen bg-[#F5F7FB] py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Header */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-green-800 mb-2">🎉 Booking Successful!</h1>
              <p className="text-lg text-green-700">
                Your coaching session has been booked successfully.
              </p>
              <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.349 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.349a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.349 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.349a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Development Mode
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-xl font-bold text-[#123C7A] mb-4">Booking Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Session:</span>
                <span className="font-medium text-[#123C7A]">Test Coaching Session</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Coach:</span>
                <span className="font-medium text-[#123C7A]">Your Coach</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Test Complete
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Session ID:</span>
                <span className="font-mono text-gray-500">{sessionId}</span>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-blue-800 mb-4">What's Next?</h3>
            <ul className="space-y-2 text-blue-700">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                In production, you would receive a confirmation email
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                The coach would contact you to schedule the session
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Session details and meeting links would be provided
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/coaches"
              className="bg-[#FF5A1F] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#FF5A1F]/90 transition-all duration-200 text-center shadow-md hover:shadow-lg"
            >
              Browse More Coaches
            </Link>
            <Link 
              href="/"
              className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200 text-center shadow-md hover:shadow-lg"
            >
              Back to Home
            </Link>
          </div>

          {/* Development Note */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="font-semibold text-yellow-800">Development Mode Active</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This is a test booking. No actual payment was processed. 
                  To enable real payments, set up Stripe Connect accounts for coaches and set DEVELOPMENT_MODE=false.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
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
      const supabase = await createClient();
      
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