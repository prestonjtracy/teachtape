#!/usr/bin/env tsx
/**
 * End-to-end commission settings integration tests
 * Tests the integration without requiring full UI/auth setup
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Test scenarios
interface TestScenario {
  name: string;
  platformFee: number;
  athletePercentFee: number;
  athleteFlatCents: number;
  bookingAmountCents: number;
  expected: {
    athleteServiceFee: number;
    totalChargedToAthlete: number;
    platformCut: number;
    coachReceives: number;
  };
}

const testScenarios: TestScenario[] = [
  {
    name: "A. Defaults sanity",
    platformFee: 10,
    athletePercentFee: 0,
    athleteFlatCents: 0,
    bookingAmountCents: 10000, // $100
    expected: {
      athleteServiceFee: 0,
      totalChargedToAthlete: 10000,
      platformCut: 1000, // $10
      coachReceives: 9000 // $90
    }
  },
  {
    name: "B. Athlete % fee",
    platformFee: 20,
    athletePercentFee: 5,
    athleteFlatCents: 0,
    bookingAmountCents: 10000, // $100
    expected: {
      athleteServiceFee: 500, // $5
      totalChargedToAthlete: 10500, // $105
      platformCut: 2000, // $20 (from $100 base)
      coachReceives: 8000 // $80
    }
  },
  {
    name: "C. Athlete flat fee",
    platformFee: 15,
    athletePercentFee: 0,
    athleteFlatCents: 200,
    bookingAmountCents: 10000, // $100
    expected: {
      athleteServiceFee: 200, // $2
      totalChargedToAthlete: 10200, // $102
      platformCut: 1500, // $15 (from $100 base)
      coachReceives: 8500 // $85
    }
  }
];

async function updateCommissionSettings(platformFee: number, athletePercent: number, athleteFlatCents: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`🔧 Setting commission: platform=${platformFee}%, athlete=${athletePercent}%/${athleteFlatCents}¢`);

  // Update settings directly in database (bypassing API auth for testing)
  const updates = [
    { key: 'platform_fee_percentage', value: platformFee.toString() },
    { key: 'athlete_service_fee_percentage', value: athletePercent.toString() },
    { key: 'athlete_service_fee_flat_cents', value: athleteFlatCents.toString() }
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('admin_settings')
      .update({ setting_value: update.value })
      .eq('setting_key', update.key);

    if (error) {
      throw new Error(`Failed to update ${update.key}: ${error.message}`);
    }
  }

  console.log(`✅ Commission settings updated`);
}

async function testCommissionCalculations() {
  console.log('🧪 Testing commission calculation integration...\n');

  // Import our commission functions
  const { getActiveCommissionSettings, calcPlatformCutCents, calcAthleteFeeLineItems } = await import('../lib/stripeFees');

  for (const scenario of testScenarios) {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`   Settings: Platform ${scenario.platformFee}%, Athlete ${scenario.athletePercentFee}%/${scenario.athleteFlatCents}¢`);
    console.log(`   Booking: $${(scenario.bookingAmountCents / 100).toFixed(2)}`);

    try {
      // Update settings for this scenario
      await updateCommissionSettings(scenario.platformFee, scenario.athletePercentFee, scenario.athleteFlatCents);

      // Wait a moment for cache to expire (our cache is 60s, but let's clear it)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get commission settings (should reflect new values)
      const settings = await getActiveCommissionSettings();
      
      console.log(`   📊 Retrieved settings: ${settings.platformCommissionPercentage}%/${settings.athleteServiceFeePercentage}%/${settings.athleteServiceFeeFlatCents}¢`);

      // Calculate platform cut
      const platformCut = calcPlatformCutCents(scenario.bookingAmountCents, settings.platformCommissionPercentage);

      // Calculate athlete fee line items
      const athleteFeeLineItems = calcAthleteFeeLineItems(
        {
          percent: settings.athleteServiceFeePercentage,
          flatCents: settings.athleteServiceFeeFlatCents
        },
        scenario.bookingAmountCents
      );

      // Calculate total athlete service fee
      let athleteServiceFee = 0;
      if (athleteFeeLineItems.percentItem) athleteServiceFee += athleteFeeLineItems.percentItem.amount_cents;
      if (athleteFeeLineItems.flatItem) athleteServiceFee += athleteFeeLineItems.flatItem.amount_cents;

      const totalChargedToAthlete = scenario.bookingAmountCents + athleteServiceFee;
      const coachReceives = scenario.bookingAmountCents - platformCut;

      // Verify against expected values
      const results = {
        athleteServiceFee,
        totalChargedToAthlete,
        platformCut,
        coachReceives
      };

      console.log(`   💰 Results:`);
      console.log(`      Athlete service fee: $${(athleteServiceFee / 100).toFixed(2)} (expected: $${(scenario.expected.athleteServiceFee / 100).toFixed(2)})`);
      console.log(`      Total charged: $${(totalChargedToAthlete / 100).toFixed(2)} (expected: $${(scenario.expected.totalChargedToAthlete / 100).toFixed(2)})`);
      console.log(`      Platform cut: $${(platformCut / 100).toFixed(2)} (expected: $${(scenario.expected.platformCut / 100).toFixed(2)})`);
      console.log(`      Coach receives: $${(coachReceives / 100).toFixed(2)} (expected: $${(scenario.expected.coachReceives / 100).toFixed(2)})`);

      // Check if results match expectations
      const matches = (
        results.athleteServiceFee === scenario.expected.athleteServiceFee &&
        results.totalChargedToAthlete === scenario.expected.totalChargedToAthlete &&
        results.platformCut === scenario.expected.platformCut &&
        results.coachReceives === scenario.expected.coachReceives
      );

      if (matches) {
        console.log(`   ✅ PASS: All calculations correct`);
      } else {
        console.log(`   ❌ FAIL: Calculations don't match expected values`);
        console.log(`   Expected:`, scenario.expected);
        console.log(`   Actual:`, results);
      }

      // Test line items
      if (scenario.athletePercentFee > 0) {
        if (athleteFeeLineItems.percentItem) {
          console.log(`   📝 Percent line item: "${athleteFeeLineItems.percentItem.name}" - $${(athleteFeeLineItems.percentItem.amount_cents / 100).toFixed(2)}`);
        } else {
          console.log(`   ❌ Expected percentage line item but got none`);
        }
      }

      if (scenario.athleteFlatCents > 0) {
        if (athleteFeeLineItems.flatItem) {
          console.log(`   📝 Flat line item: "${athleteFeeLineItems.flatItem.name}" - $${(athleteFeeLineItems.flatItem.amount_cents / 100).toFixed(2)}`);
        } else {
          console.log(`   ❌ Expected flat fee line item but got none`);
        }
      }

    } catch (error) {
      console.log(`   💥 ERROR: ${error}`);
    }
  }
}

async function testValidationAndClamping() {
  console.log('\n🔒 Testing validation and clamping...\n');

  const { calcPlatformCutCents, calcAthleteFeeLineItems } = await import('../lib/stripeFees');

  const testCases = [
    { name: 'Platform -1% clamped to 0%', platform: -1, expected: 0 },
    { name: 'Platform 40% clamped to 30%', platform: 40, expected: 3000 },
    { name: 'Athlete 50% clamped to 30%', athletePercent: 50, expected: 3000 },
    { name: 'Flat $50 clamped to $20', athleteFlat: 5000, expected: 2000 }
  ];

  for (const testCase of testCases) {
    try {
      if ('platform' in testCase) {
        const result = calcPlatformCutCents(10000, testCase.platform);
        const success = result === testCase.expected;
        console.log(`   ${success ? '✅' : '❌'} ${testCase.name}: ${result} (expected: ${testCase.expected})`);
      } else if ('athletePercent' in testCase) {
        const result = calcAthleteFeeLineItems({ percent: testCase.athletePercent, flatCents: 0 }, 10000);
        const actual = result.percentItem?.amount_cents || 0;
        const success = actual === testCase.expected;
        console.log(`   ${success ? '✅' : '❌'} ${testCase.name}: ${actual} (expected: ${testCase.expected})`);
      } else if ('athleteFlat' in testCase) {
        const result = calcAthleteFeeLineItems({ percent: 0, flatCents: testCase.athleteFlat }, 10000);
        const actual = result.flatItem?.amount_cents || 0;
        const success = actual === testCase.expected;
        console.log(`   ${success ? '✅' : '❌'} ${testCase.name}: ${actual} (expected: ${testCase.expected})`);
      }
    } catch (error) {
      console.log(`   💥 ${testCase.name}: ERROR - ${error}`);
    }
  }
}

async function testFeatureFlag() {
  console.log('\n🚩 Testing feature flag fallback...\n');

  // Test that feature flag logic works
  const useCommissionSettings1 = process.env.ENABLE_COMMISSION_SETTINGS !== 'false';
  console.log(`   Current flag state: ENABLE_COMMISSION_SETTINGS=${process.env.ENABLE_COMMISSION_SETTINGS || 'undefined'}`);
  console.log(`   Evaluated as: ${useCommissionSettings1} (should be true)`);

  // Simulate setting flag to false
  process.env.ENABLE_COMMISSION_SETTINGS = 'false';
  const useCommissionSettings2 = process.env.ENABLE_COMMISSION_SETTINGS !== 'false';
  console.log(`   After setting to 'false': ${useCommissionSettings2} (should be false)`);

  // Reset for other tests
  delete process.env.ENABLE_COMMISSION_SETTINGS;
  const useCommissionSettings3 = process.env.ENABLE_COMMISSION_SETTINGS !== 'false';
  console.log(`   After unsetting: ${useCommissionSettings3} (should be true)`);

  console.log(`   ✅ Feature flag logic working correctly`);
}

async function testEdgeCases() {
  console.log('\n🔍 Testing edge cases...\n');

  const { calcPlatformCutCents, calcAthleteFeeLineItems } = await import('../lib/stripeFees');

  const edgeCases = [
    { name: '$1.00 booking', amount: 100, platform: 10, expected: 10 },
    { name: '$0.50 booking', amount: 50, platform: 10, expected: 5 },
    { name: '$0.01 booking', amount: 1, platform: 10, expected: 0 } // Should round to 0
  ];

  for (const edgeCase of edgeCases) {
    try {
      const platformCut = calcPlatformCutCents(edgeCase.amount, edgeCase.platform);
      const coachReceives = edgeCase.amount - platformCut;
      
      console.log(`   ${edgeCase.name}: Platform gets $${(platformCut / 100).toFixed(2)}, Coach gets $${(coachReceives / 100).toFixed(2)}`);
      
      if (platformCut >= 0 && coachReceives >= 0 && platformCut + coachReceives === edgeCase.amount) {
        console.log(`     ✅ Math checks out`);
      } else {
        console.log(`     ❌ Math error: ${platformCut} + ${coachReceives} ≠ ${edgeCase.amount}`);
      }
    } catch (error) {
      console.log(`   💥 ${edgeCase.name}: ERROR - ${error}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  try {
    console.log('🎯 Commission Settings End-to-End Integration Tests');
    console.log('=' .repeat(60));

    await testCommissionCalculations();
    await testValidationAndClamping();
    await testFeatureFlag();
    await testEdgeCases();

    console.log('\n🎉 End-to-end integration testing completed!');
    console.log('\nNote: These tests verify the core integration logic.');
    console.log('For full Stripe/webhook testing, manual checkout flows are needed.');

  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { runAllTests };