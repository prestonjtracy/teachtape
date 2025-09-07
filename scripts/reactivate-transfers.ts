import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: "2024-06-20" 
});

async function reactivateTransfers() {
  try {
    const accountId = 'acct_1S4lyAAWbPNyO58g';
    
    console.log('🔧 Checking current account status...');
    
    // Check current state
    const account = await stripe.accounts.retrieve(accountId);
    console.log('📊 Current account details:');
    console.log('  - Capabilities:', account.capabilities);
    console.log('  - Charges enabled:', account.charges_enabled);
    console.log('  - Details submitted:', account.details_submitted);
    console.log('  - Requirements needed:', account.requirements?.currently_due);
    console.log('  - Requirements pending:', account.requirements?.pending_verification);
    
    // If transfers capability is inactive, we need to reactivate it
    if (account.capabilities?.transfers === 'inactive') {
      console.log('\n🔄 Transfers capability is inactive. Attempting to reactivate...');
      
      // For Express accounts, we may need to update the account to reactivate
      const updatedAccount = await stripe.accounts.update(accountId, {
        capabilities: {
          transfers: { requested: true }
        }
      });
      
      console.log('✅ Updated account capabilities:', updatedAccount.capabilities);
    } else if (account.capabilities?.transfers === 'active') {
      console.log('✅ Transfers capability is already active!');
    } else {
      console.log('⚠️ Transfers capability status:', account.capabilities?.transfers || 'not found');
    }
    
    // If the account needs onboarding completion, create a new onboarding link
    if (!account.charges_enabled || account.capabilities?.transfers !== 'active') {
      console.log('\n🔗 Account needs onboarding completion. Creating new onboarding link...');
      
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: 'http://localhost:3000/my-profile?onboard=refresh',
        return_url: `http://localhost:3000/my-profile?onboard=done&acct=${accountId}`,
        type: 'account_onboarding',
      });
      
      console.log('🌐 New onboarding link created:');
      console.log(accountLink.url);
      console.log('\n🎯 NEXT STEPS:');
      console.log('1. Visit the onboarding link above to complete Stripe setup');
      console.log('2. This will reactivate the transfers capability');
      console.log('3. Then try accepting the booking request again');
    }
    
  } catch (error) {
    console.error('❌ Failed to reactivate transfers:', error);
  }
}

reactivateTransfers();