import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: "2024-06-20" 
});

async function enableCapabilities() {
  try {
    const accountId = 'acct_1S4lyAAWbPNyO58g';
    
    console.log('🔧 Enabling card_payments capability for account:', accountId);
    
    // Check current capabilities
    const account = await stripe.accounts.retrieve(accountId);
    console.log('📊 Current capabilities:', account.capabilities);
    
    // Request card_payments capability if not already enabled
    if (account.capabilities?.card_payments !== 'active') {
      console.log('🔄 Requesting card_payments capability...');
      
      const updatedAccount = await stripe.accounts.update(accountId, {
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });
      
      console.log('✅ Updated capabilities:', updatedAccount.capabilities);
    } else {
      console.log('✅ card_payments capability already active');
    }
    
    // Check final state
    const finalAccount = await stripe.accounts.retrieve(accountId);
    console.log('🎯 Final account state:');
    console.log('  - Capabilities:', finalAccount.capabilities);
    console.log('  - Charges enabled:', finalAccount.charges_enabled);
    console.log('  - Details submitted:', finalAccount.details_submitted);
    
  } catch (error) {
    console.error('❌ Failed to enable capabilities:', error);
  }
}

enableCapabilities();