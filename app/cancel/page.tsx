import Link from 'next/link';

interface CancelPageProps {
  searchParams: {
    coach_id?: string;
    listing_id?: string;
  };
}

export default function CancelPage({ searchParams }: CancelPageProps) {
  const coachId = searchParams.coach_id;
  const listingId = searchParams.listing_id;

  // Determine retry link
  let retryHref = '/coaches';
  let retryText = 'Browse Coaches';
  
  if (coachId) {
    retryHref = `/coaches/${coachId}`;
    retryText = 'Try Again';
  }

  return (
    <main style={{ padding: 24, textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ 
        backgroundColor: '#fff3cd', 
        color: '#856404', 
        padding: 24, 
        borderRadius: 8,
        marginBottom: 32
      }}>
        <h1 style={{ margin: '0 0 12px 0', fontSize: 28 }}>Payment Cancelled</h1>
        <p style={{ margin: 0, fontSize: 16 }}>
          No worries! Your payment was cancelled and no charges were made.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Ready to book your session?</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          The coaching session is still available. You can try booking again anytime.
        </p>
        
        <Link 
          href={retryHref}
          style={{ 
            display: 'inline-block',
            padding: '16px 32px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 16
          }}
        >
          {retryText}
        </Link>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: 16, 
        justifyContent: 'center', 
        flexWrap: 'wrap',
        marginBottom: 32
      }}>
        <Link 
          href="/coaches"
          style={{ 
            padding: '8px 16px',
            color: '#007bff',
            textDecoration: 'none',
            border: '1px solid #007bff',
            borderRadius: 4
          }}
        >
          All Coaches
        </Link>
        <Link 
          href="/"
          style={{ 
            padding: '8px 16px',
            color: '#6c757d',
            textDecoration: 'none',
            border: '1px solid #6c757d',
            borderRadius: 4
          }}
        >
          Home
        </Link>
      </div>

      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: 16, 
        borderRadius: 8,
        fontSize: 14,
        color: '#666'
      }}>
        <p style={{ margin: 0 }}>
          Having trouble with payments? Contact our support team for assistance.
        </p>
      </div>
    </main>
  );
}