'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentCompletePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing payment...');
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const clientSecret = searchParams.get('payment_intent_client_secret');
  const conversationId = searchParams.get('conversation_id');

  useEffect(() => {
    if (!clientSecret) {
      setStatus('error');
      setMessage('Missing payment information');
      return;
    }

    const confirmPayment = async () => {
      try {
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);

        if (error) {
          setStatus('error');
          setMessage(`Payment failed: ${error.message}`);
        } else if (paymentIntent) {
          switch (paymentIntent.status) {
            case 'succeeded':
              setStatus('success');
              setMessage('Payment completed successfully! Your booking is confirmed.');
              // Redirect to conversation after 3 seconds
              if (conversationId) {
                setTimeout(() => {
                  router.push(`/messages/${conversationId}`);
                }, 3000);
              }
              break;
            case 'processing':
              setMessage('Your payment is processing...');
              break;
            case 'requires_action':
              setMessage('Your payment requires additional authentication.');
              // Redirect to complete authentication
              const { error: confirmError } = await stripe.confirmPayment({
                clientSecret,
                return_url: window.location.href,
              });
              if (confirmError) {
                setStatus('error');
                setMessage(`Authentication failed: ${confirmError.message}`);
              }
              break;
            default:
              setStatus('error');
              setMessage('Something went wrong with your payment.');
          }
        }
      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred');
        console.error('Payment confirmation error:', err);
      }
    };

    confirmPayment();
  }, [clientSecret, conversationId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          )}
          {status === 'success' && (
            <div className="text-green-600 text-6xl mb-4">✅</div>
          )}
          {status === 'error' && (
            <div className="text-red-600 text-6xl mb-4">❌</div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'loading' && 'Processing Payment'}
          {status === 'success' && 'Payment Successful'}
          {status === 'error' && 'Payment Failed'}
        </h1>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        {status === 'success' && conversationId && (
          <p className="text-sm text-gray-500 mb-4">
            Redirecting to your conversation in a few seconds...
          </p>
        )}
        
        <div className="space-y-3">
          {conversationId && (
            <button
              onClick={() => router.push(`/messages/${conversationId}`)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Chat
            </button>
          )}
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}