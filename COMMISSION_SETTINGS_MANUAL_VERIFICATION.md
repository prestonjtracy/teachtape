# Commission Settings Manual Verification Guide

This document outlines manual verification steps for the commission settings implementation.

## Prerequisites

1. Set up admin commission settings in the database
2. Ensure `ENABLE_COMMISSION_SETTINGS` environment variable is set to `true` (default)
3. Have a test Stripe account with Connect configured
4. Have test coach and athlete accounts

## Test Scenarios

### Scenario A: Platform 10%, Athlete fee 0%/0¢ → Platform takes $10, Coach receives $90

**Setup:**
- Platform fee: 10%
- Athlete service fee: 0% and $0.00

**Test Steps:**
1. Create a $100.00 listing
2. Initiate checkout via `/api/checkout`
3. Verify Stripe Checkout shows:
   - Line item: "$100.00 Coaching Session"
   - Total: $100.00
4. Complete payment
5. Check webhook logs for:
   - `platform_fee_amount_cents: 1000` ($10.00)
   - `athlete_fee_added_cents: 0`
6. Verify Stripe dashboard shows:
   - `application_fee_amount`: $10.00
   - Transfer to coach: $90.00

**Expected Results:**
- ✅ Athlete charged: $100.00
- ✅ Platform commission: $10.00
- ✅ Coach receives: $90.00

---

### Scenario B: Platform 20%, Athlete fee 5% → Extra $5 line item; Platform takes $20; Coach receives $80

**Setup:**
- Platform fee: 20%
- Athlete service fee: 5% (percentage-based)

**Test Steps:**
1. Create a $100.00 listing
2. Initiate checkout via `/api/checkout`
3. Verify Stripe Checkout shows:
   - Line item 1: "$100.00 Coaching Session"
   - Line item 2: "$5.00 Service fee (5%)"
   - Total: $105.00
4. Complete payment
5. Check webhook logs for:
   - `platform_fee_amount_cents: 2000` ($20.00)
   - `athlete_fee_added_cents: 500` ($5.00)
6. Verify Stripe dashboard shows:
   - `application_fee_amount`: $20.00 (from base $100, not $105)
   - Transfer to coach: $80.00

**Expected Results:**
- ✅ Athlete charged: $105.00 ($100 + $5 service fee)
- ✅ Platform commission: $20.00 (20% of $100 base)
- ✅ Coach receives: $80.00 ($100 - $20 commission)
- ✅ Service fee goes to platform

---

### Scenario C: Platform 15%, Athlete flat $2.00 → Extra $2 line item; Platform takes $15; Coach receives $85

**Setup:**
- Platform fee: 15%
- Athlete service fee: $2.00 (flat fee)

**Test Steps:**
1. Create a $100.00 listing
2. Initiate checkout via `/api/checkout`
3. Verify Stripe Checkout shows:
   - Line item 1: "$100.00 Coaching Session"
   - Line item 2: "$2.00 Service fee"
   - Total: $102.00
4. Complete payment
5. Check webhook logs for:
   - `platform_fee_amount_cents: 1500` ($15.00)
   - `athlete_fee_added_cents: 200` ($2.00)
6. Verify Stripe dashboard shows:
   - `application_fee_amount`: $15.00
   - Transfer to coach: $85.00

**Expected Results:**
- ✅ Athlete charged: $102.00 ($100 + $2 service fee)
- ✅ Platform commission: $15.00 (15% of $100 base)
- ✅ Coach receives: $85.00 ($100 - $15 commission)

---

## Feature Flag Testing

### Test Legacy Mode (ENABLE_COMMISSION_SETTINGS=false)

**Setup:**
- Set environment variable: `ENABLE_COMMISSION_SETTINGS=false`

**Test Steps:**
1. Create a $100.00 listing
2. Initiate checkout
3. Verify behavior matches pre-commission-settings implementation
4. Check logs for "Commission settings disabled, using legacy behavior"

---

## Automated Unit Tests

Run the unit tests for fee calculation functions:

```bash
npx tsx scripts/test-fee-calculations.ts
```

This tests:
- `calcPlatformCutCents()` function
- `calcAthleteFeeLineItems()` function
- Edge cases and clamping behavior

---

## Clamping/Safety Tests

### Test Platform Fee Clamping
- Set platform fee to 35% → Should clamp to 30%
- Set platform fee to -5% → Should clamp to 0%

### Test Athlete Fee Clamping
- Set athlete fee percentage to 35% → Should clamp to 30%
- Set athlete fee flat to $25.00 → Should clamp to $20.00

---

## Audit Logging Verification

Check application logs for audit entries:

```
📊 [AUDIT] commission_settings.applied: {
  session_id: "cs_...",
  platform_fee_amount_cents: "1000",
  athlete_fee_added_cents: "500"
}
```

Ensure no PII (personally identifiable information) is logged.

---

## Integration with Booking Requests

Test the `/api/requests/[id]/accept` flow:

1. Create a booking request
2. Coach accepts the request
3. Verify commission settings are applied to the PaymentIntent
4. Check logs for commission percentage used

---

## Webhook Verification

1. Complete a checkout with commission settings
2. Check webhook handler logs for:
   - Application fee verification
   - Metadata extraction
   - Audit logging

---

## Error Handling

### Test Invalid Settings
- Invalid commission percentages (>30%)
- Invalid flat fees (>$20.00)
- Verify graceful fallback to defaults

### Test Database Unavailability
- Simulate database connection issues
- Verify fallback to `DEFAULT_COMMISSION_SETTINGS`

---

## Performance Testing

### Test Caching
1. Make multiple requests within 60 seconds
2. Verify settings are cached (check logs for DB calls)
3. Wait 60+ seconds, make another request
4. Verify cache refresh

---

## Files Modified

### Extended/Modified Files:
- `lib/stripeFees.ts` - Added new fee calculation functions
- `app/api/checkout/route.ts` - Updated to use new commission system
- `app/api/requests/[id]/accept/route.ts` - Updated for dynamic commissions
- `app/api/stripe/webhook/route.ts` - Added verification and audit logging

### Key Functions Added:
- `getActiveCommissionSettings()` - Cached settings retrieval
- `calcPlatformCutCents()` - Integer-based platform fee calculation
- `calcAthleteFeeLineItems()` - Athlete fee line item generation

### Feature Flag:
- `ENABLE_COMMISSION_SETTINGS` environment variable (default: true)

---

## Success Criteria

✅ No duplicate fee modules created  
✅ Existing `platform_fee_percentage` remains single source of truth  
✅ Settings cached to avoid DB spam  
✅ All math in integer cents with proper rounding  
✅ Clamping applied (platform 0-30%, athlete 0-30%/0-$20)  
✅ Athlete service fees shown as separate line items  
✅ Platform commission calculated from base price only  
✅ Coach receives: basePriceCents - platformCommission  
✅ Feature flag allows legacy fallback  
✅ Audit logging without PII  
✅ Webhook verification of application_fee_amount  
✅ All existing flows continue to work