/**
 * Pre-Deployment Checklist Script
 *
 * Run this before deploying to production to catch common issues
 * Usage: npx tsx scripts/pre-deployment-check.ts
 */

console.log('🔍 TeachTape Pre-Deployment Checklist\n');

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, passMsg: string, failMsg: string, isWarning = false) {
  if (condition) {
    results.push({ name, status: 'pass', message: passMsg });
  } else {
    results.push({ name, status: isWarning ? 'warn' : 'fail', message: failMsg });
  }
}

// Check 1: Environment Variables
console.log('📋 Checking environment variables...');

// Required variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'APP_URL',
];

const missingRequired = requiredEnvVars.filter(v => !process.env[v]);

check(
  'Required Environment Variables',
  missingRequired.length === 0,
  `All ${requiredEnvVars.length} required environment variables are set`,
  `Missing required variables: ${missingRequired.join(', ')}`,
  false
);

// Optional but recommended variables
const optionalEnvVars = [
  'ZOOM_ACCOUNT_ID',
  'ZOOM_CLIENT_ID',
  'ZOOM_CLIENT_SECRET',
  'RESEND_API_KEY',
];

const missingOptional = optionalEnvVars.filter(v => !process.env[v]);

check(
  'Optional Environment Variables',
  missingOptional.length === 0,
  'All optional variables are configured',
  `Optional variables not set: ${missingOptional.join(', ')}. App will work but features may be limited.`,
  true
);

// Check 2: Zoom Configuration
console.log('🎥 Checking Zoom integration...');

const hasZoomId = !!process.env.ZOOM_ACCOUNT_ID;
const hasZoomClient = !!process.env.ZOOM_CLIENT_ID;
const hasZoomSecret = !!process.env.ZOOM_CLIENT_SECRET;
const zoomConfigured = hasZoomId && hasZoomClient && hasZoomSecret;

check(
  'Zoom Integration',
  zoomConfigured || (!hasZoomId && !hasZoomClient && !hasZoomSecret),
  zoomConfigured
    ? 'Zoom fully configured - meetings will be created'
    : 'Zoom not configured - app will work without video meetings',
  'Zoom partially configured - some credentials missing',
  true
);

// Check 3: Email Configuration
console.log('📧 Checking email configuration...');

const hasResend = !!process.env.RESEND_API_KEY;
const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

check(
  'Email Service',
  hasResend || hasSmtp,
  hasResend ? 'Resend configured' : 'SMTP configured',
  'No email service configured - users won\'t receive booking confirmations',
  false
);

// Check 4: URL Configuration
console.log('🌐 Checking URL configuration...');

const appUrl = process.env.APP_URL || '';
const isProduction = appUrl.includes('localhost') === false && appUrl.length > 0;

check(
  'Production URL',
  isProduction,
  `Production URL set: ${appUrl}`,
  'APP_URL not set or points to localhost - update before deploying',
  false
);

// Check 5: Stripe Mode
console.log('💳 Checking Stripe configuration...');

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const isLiveMode = stripeKey.startsWith('sk_live_');

check(
  'Stripe Live Mode',
  isLiveMode,
  'Using Stripe LIVE keys - real payments enabled',
  stripeKey.startsWith('sk_test_')
    ? 'Using Stripe TEST keys - switch to live keys for production'
    : 'Stripe key invalid or not set',
  false
);

// Print results
console.log('\n📊 Results:\n');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

results.forEach(result => {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
  const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'warn' ? '\x1b[33m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`${icon} ${color}${result.name}${reset}: ${result.message}`);

  if (result.status === 'pass') passCount++;
  else if (result.status === 'warn') warnCount++;
  else failCount++;
});

console.log('\n' + '='.repeat(80));
console.log(`\n📈 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed\n`);

if (failCount > 0) {
  console.log('❌ DEPLOYMENT NOT RECOMMENDED');
  console.log('Please fix the failed checks before deploying to production.\n');
  process.exit(1);
} else if (warnCount > 0) {
  console.log('⚠️  DEPLOYMENT POSSIBLE WITH WARNINGS');
  console.log('App will work but some features may be limited.\n');
  console.log('Recommended: Fix warnings for full functionality.\n');
  process.exit(0);
} else {
  console.log('✅ ALL CHECKS PASSED');
  console.log('Your app is ready for production deployment!\n');
  console.log('Next steps:');
  console.log('1. Run: npm run build');
  console.log('2. Run: npm run typecheck');
  console.log('3. Deploy: vercel --prod\n');
  process.exit(0);
}
