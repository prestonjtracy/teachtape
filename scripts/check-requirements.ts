import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: "2024-06-20" 
});

async function checkRequirements() {
  try {
    const accountId = 'acct_1S4lyAAWbPNyO58g';
    
    console.log('🔍 Checking account requirements...\n');
    
    const account = await stripe.accounts.retrieve(accountId);
    
    console.log('📊 Account Status:');
    console.log('  - Capabilities:', account.capabilities);
    console.log('  - Charges enabled:', account.charges_enabled);
    console.log('  - Payouts enabled:', account.payouts_enabled);
    console.log('  - Details submitted:', account.details_submitted);
    
    console.log('\n📋 Requirements:');
    console.log('  - Currently due:', account.requirements?.currently_due || []);
    console.log('  - Eventually due:', account.requirements?.eventually_due || []);
    console.log('  - Pending verification:', account.requirements?.pending_verification || []);
    console.log('  - Past due:', account.requirements?.past_due || []);
    console.log('  - Disabled reason:', account.requirements?.disabled_reason || 'none');
    
    console.log('\n💰 Business Profile:');
    console.log('  - MCC:', account.business_profile?.mcc || 'not set');
    console.log('  - URL:', account.business_profile?.url || 'not set');
    console.log('  - Name:', account.business_profile?.name || 'not set');
    
    console.log('\n👤 Individual:');
    console.log('  - Verification status:', account.individual?.verification?.status || 'not available');
    console.log('  - Verification details:', account.individual?.verification?.details_code || 'none');
    
    // If there are still requirements, show what needs to be done
    const allRequirements = [
      ...(account.requirements?.currently_due || []),
      ...(account.requirements?.eventually_due || [])
    ];
    
    if (allRequirements.length > 0) {
      console.log('\n⚠️  Outstanding Requirements:');
      allRequirements.forEach(req => {
        console.log(`  - ${req}`);
      });
      
      console.log('\n🔗 Create new onboarding link to complete requirements:');
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: 'http://localhost:3000/my-profile?onboard=refresh',
        return_url: `http://localhost:3000/my-profile?onboard=done&acct=${accountId}`,
        type: 'account_onboarding',
      });
      
      console.log(accountLink.url);
    } else if (account.capabilities?.transfers !== 'active') {
      console.log('\n🤔 No outstanding requirements but transfers still inactive.');
      console.log('This might indicate pending review or other issues.');
      console.log('Consider contacting Stripe support or waiting for review completion.');
    }
    
  } catch (error) {
    console.error('❌ Failed to check requirements:', error);
  }
}

checkRequirements();