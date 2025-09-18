#!/usr/bin/env tsx
/**
 * Unit tests for commission fee calculation functions
 * Run with: npx tsx scripts/test-fee-calculations.ts
 */

import { calcPlatformCutCents, calcAthleteFeeLineItems } from '../lib/stripeFees';

interface TestCase {
  name: string;
  input: any;
  expected: any;
  testFn: () => boolean;
}

const tests: TestCase[] = [
  // calcPlatformCutCents tests
  {
    name: 'calcPlatformCutCents: 10% of $100.00',
    input: { subtotalCents: 10000, platformPct: 10 },
    expected: 1000,
    testFn: () => calcPlatformCutCents(10000, 10) === 1000
  },
  {
    name: 'calcPlatformCutCents: 20% of $100.00',
    input: { subtotalCents: 10000, platformPct: 20 },
    expected: 2000,
    testFn: () => calcPlatformCutCents(10000, 20) === 2000
  },
  {
    name: 'calcPlatformCutCents: 15% of $100.00',
    input: { subtotalCents: 10000, platformPct: 15 },
    expected: 1500,
    testFn: () => calcPlatformCutCents(10000, 15) === 1500
  },
  {
    name: 'calcPlatformCutCents: 35% clamped to 30%',
    input: { subtotalCents: 10000, platformPct: 35 },
    expected: 3000,
    testFn: () => calcPlatformCutCents(10000, 35) === 3000
  },
  {
    name: 'calcPlatformCutCents: -5% clamped to 0%',
    input: { subtotalCents: 10000, platformPct: -5 },
    expected: 0,
    testFn: () => calcPlatformCutCents(10000, -5) === 0
  },
  {
    name: 'calcPlatformCutCents: Rounding test (33.33% of $100.00)',
    input: { subtotalCents: 10000, platformPct: 33.33 },
    expected: 3000, // 33.33% clamped to 30%
    testFn: () => calcPlatformCutCents(10000, 33.33) === 3000
  },

  // calcAthleteFeeLineItems tests
  {
    name: 'calcAthleteFeeLineItems: No fees',
    input: { feeConfig: { percent: 0, flatCents: 0 }, subtotalCents: 10000 },
    expected: {},
    testFn: () => {
      const result = calcAthleteFeeLineItems({ percent: 0, flatCents: 0 }, 10000);
      return !result.percentItem && !result.flatItem;
    }
  },
  {
    name: 'calcAthleteFeeLineItems: 5% fee only',
    input: { feeConfig: { percent: 5, flatCents: 0 }, subtotalCents: 10000 },
    expected: { percentItem: { name: 'Service fee (5%)', amount_cents: 500 } },
    testFn: () => {
      const result = calcAthleteFeeLineItems({ percent: 5, flatCents: 0 }, 10000);
      return result.percentItem?.name === 'Service fee (5%)' && 
             result.percentItem?.amount_cents === 500 &&
             !result.flatItem;
    }
  },
  {
    name: 'calcAthleteFeeLineItems: $2.00 flat fee only',
    input: { feeConfig: { percent: 0, flatCents: 200 }, subtotalCents: 10000 },
    expected: { flatItem: { name: 'Service fee', amount_cents: 200 } },
    testFn: () => {
      const result = calcAthleteFeeLineItems({ percent: 0, flatCents: 200 }, 10000);
      return result.flatItem?.name === 'Service fee' && 
             result.flatItem?.amount_cents === 200 &&
             !result.percentItem;
    }
  },
  {
    name: 'calcAthleteFeeLineItems: Both percentage and flat fees',
    input: { feeConfig: { percent: 5, flatCents: 200 }, subtotalCents: 10000 },
    expected: { 
      percentItem: { name: 'Service fee (5%)', amount_cents: 500 },
      flatItem: { name: 'Service fee', amount_cents: 200 }
    },
    testFn: () => {
      const result = calcAthleteFeeLineItems({ percent: 5, flatCents: 200 }, 10000);
      return result.percentItem?.name === 'Service fee (5%)' && 
             result.percentItem?.amount_cents === 500 &&
             result.flatItem?.name === 'Service fee' && 
             result.flatItem?.amount_cents === 200;
    }
  },
  {
    name: 'calcAthleteFeeLineItems: Percentage clamping (35% → 30%)',
    input: { feeConfig: { percent: 35, flatCents: 0 }, subtotalCents: 10000 },
    expected: { percentItem: { name: 'Service fee (30%)', amount_cents: 3000 } },
    testFn: () => {
      const result = calcAthleteFeeLineItems({ percent: 35, flatCents: 0 }, 10000);
      return result.percentItem?.name === 'Service fee (30%)' && 
             result.percentItem?.amount_cents === 3000;
    }
  },
  {
    name: 'calcAthleteFeeLineItems: Flat fee clamping ($25.00 → $20.00)',
    input: { feeConfig: { percent: 0, flatCents: 2500 }, subtotalCents: 10000 },
    expected: { flatItem: { name: 'Service fee', amount_cents: 2000 } },
    testFn: () => {
      const result = calcAthleteFeeLineItems({ percent: 0, flatCents: 2500 }, 10000);
      return result.flatItem?.name === 'Service fee' && 
             result.flatItem?.amount_cents === 2000;
    }
  }
];

function runTests() {
  console.log('🧪 Running fee calculation tests...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const success = test.testFn();
      if (success) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Input: ${JSON.stringify(test.input)}`);
        console.log(`   Expected: ${JSON.stringify(test.expected)}`);
        failed++;
      }
    } catch (error) {
      console.log(`💥 ${test.name} - ERROR: ${error}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };