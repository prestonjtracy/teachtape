/**
 * E2E Test for Stripe Booking Webhook Flow
 * 
 * EXACT RUN STEPS:
 * 
 * # Terminal A (webhook listener):
 * stripe listen --forward-to http://localhost:3000/api/stripe/webhook
 * 
 * # Terminal B (start dev):
 * npm run dev
 * 
 * # Trigger a checkout (either):
 * - Use the UI "Book" button and complete test payment
 * OR
 * - stripe trigger checkout.session.completed
 * 
 * # Then run the verifier:
 * npm run test:booking
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env.local');

dotenv.config({ path: envPath });

interface BookingRow {
  id: string;
  created_at: string;
  listing_id?: string;
  coach_id?: string;
  amount_paid_cents?: number;
  status: string;
  stripe_session_id?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  row?: BookingRow;
  missingFields?: string[];
}

async function testBookingWebhook(): Promise<TestResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      message: '❌ Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)'
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Poll for recent bookings (last 5 minutes) with retry logic
  const startTime = Date.now();
  const maxWaitTime = 90 * 1000; // 90 seconds
  const pollInterval = 2000; // 2 seconds

  console.log('🔍 Polling for recent bookings (up to 90 seconds)...');
  console.log(`📅 Looking for bookings created after: ${new Date(Date.now() - 5 * 60 * 1000).toISOString()}`);

  while (Date.now() - startTime < maxWaitTime) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, created_at, listing_id, coach_id, amount_paid_cents, status, stripe_session_id')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `❌ Database query error: ${error.message}`
      };
    }

    if (!bookings || bookings.length === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r⏳ No recent bookings found... (${elapsed}s/${Math.round(maxWaitTime/1000)}s)`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      continue;
    }

    // Found a recent booking - validate it
    const booking = bookings[0] as BookingRow;
    console.log('\n✅ Found recent booking:', {
      id: booking.id,
      created_at: booking.created_at,
      status: booking.status
    });

    // Check required fields
    const requiredFields = [
      { name: 'status', value: booking.status, expectedValue: 'paid' },
      { name: 'listing_id', value: booking.listing_id },
      { name: 'coach_id', value: booking.coach_id },
      { name: 'amount_paid_cents', value: booking.amount_paid_cents },
      { name: 'stripe_session_id', value: booking.stripe_session_id }
    ];

    const missingFields: string[] = [];
    const incorrectFields: string[] = [];

    for (const field of requiredFields) {
      if (field.expectedValue) {
        // Check for specific expected value
        if (field.value !== field.expectedValue) {
          incorrectFields.push(`${field.name} (expected '${field.expectedValue}', got '${field.value}')`);
        }
      } else {
        // Check for non-null/non-empty
        if (!field.value) {
          missingFields.push(field.name);
        }
      }
    }

    if (missingFields.length === 0 && incorrectFields.length === 0) {
      return {
        success: true,
        message: '✅ PASS - All required fields are present and correct!',
        row: booking
      };
    } else {
      const issues = [...missingFields.map(f => `missing ${f}`), ...incorrectFields];
      return {
        success: false,
        message: `❌ FAIL - Issues found: ${issues.join(', ')}`,
        row: booking,
        missingFields: [...missingFields, ...incorrectFields]
      };
    }
  }

  return {
    success: false,
    message: `❌ TIMEOUT - No bookings found in the last 5 minutes after waiting ${maxWaitTime/1000} seconds`
  };
}

async function main() {
  console.log('🚀 Starting E2E Booking Webhook Test...\n');
  
  const result = await testBookingWebhook();
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULT');
  console.log('='.repeat(60));
  console.log(result.message);
  
  if (result.row) {
    console.log('\n📊 BOOKING DATA:');
    console.log(JSON.stringify(result.row, null, 2));
  }
  
  if (result.missingFields && result.missingFields.length > 0) {
    console.log('\n❌ MISSING/INCORRECT FIELDS:');
    result.missingFields.forEach(field => console.log(`  - ${field}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});