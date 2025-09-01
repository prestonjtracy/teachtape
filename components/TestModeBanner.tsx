/**
 * Global banner that shows when the app is running in Stripe test mode
 * Helps developers and testers understand they're using test payments
 */
interface TestModeBannerProps {
  isTestMode: boolean;
}

export default function TestModeBanner({ isTestMode }: TestModeBannerProps) {
  if (!isTestMode) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#ff6b35',
      color: 'white',
      padding: '8px 16px',
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 'bold',
      zIndex: 9999,
      borderBottom: '2px solid #e55100',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      🧪 TEST MODE - Payments will not be charged • Use test card 4242 4242 4242 4242
    </div>
  );
}