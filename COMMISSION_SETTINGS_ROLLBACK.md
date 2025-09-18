# Commission Settings Rollback Guide

This document provides clear instructions for reverting to fixed fee constants if needed.

## Quick Rollback (Feature Flag)

The fastest way to disable commission settings is using the environment variable:

```bash
# Disable commission settings, revert to fixed constants
ENABLE_COMMISSION_SETTINGS=false
```

When disabled, the system falls back to:
- **Platform fee**: 10% (fixed constant)
- **Athlete service fee**: 0% / $0.00 (fixed constants)
- **Legacy behavior**: Uses the original `calculateApplicationFee()` function

### Setting the Flag

**Development:**
```bash
# In .env.local
ENABLE_COMMISSION_SETTINGS=false
```

**Production:**
Set the environment variable in your deployment platform (Vercel, etc.):
```bash
ENABLE_COMMISSION_SETTINGS=false
```

**Default Behavior:**
- If not set: `ENABLE_COMMISSION_SETTINGS` defaults to `true`
- If set to any value other than `'false'`: Commission settings are enabled

## Rollback Verification

After setting the flag to `false`, verify the rollback:

1. **Checkout API**: Check logs for "Commission settings disabled, using legacy behavior"
2. **Booking Requests**: Check logs for "Using legacy 5% fee"  
3. **Fee Calculations**: All fees should use hardcoded constants

## Complete Rollback (Code Changes)

If you need to completely remove commission settings functionality:

### 1. Update Environment Variable
```bash
ENABLE_COMMISSION_SETTINGS=false
```

### 2. Revert Code Files (if needed)

**Files to revert:**

**`lib/stripeFees.ts`:**
- Remove `getActiveCommissionSettings()`, `calcPlatformCutCents()`, `calcAthleteFeeLineItems()`
- Keep only original `calculateApplicationFee()` function
- Remove commission-related types and interfaces

**`app/api/checkout/route.ts`:**
- Remove commission settings logic
- Use only: `const platformFeeAmount = calculateApplicationFee(rateCents);`
- Remove athlete service fee line items
- Simplify metadata

**`app/api/requests/[id]/accept/route.ts`:**
- Revert to: `const applicationFee = Math.round(listingPrice * 0.05);`
- Remove commission settings import and logic

**`app/api/stripe/webhook/route.ts`:**
- Remove commission verification logic
- Remove audit logging for commission settings
- Keep basic webhook functionality

### 3. Database Cleanup (optional)

If you want to remove commission settings from database:

```sql
-- Remove commission-related settings (CAUTION: This is irreversible)
DELETE FROM admin_settings 
WHERE setting_key IN (
  'platform_fee_percentage',
  'athlete_service_fee_percentage', 
  'athlete_service_fee_flat_cents'
);

-- Remove commission audit logs (optional)
DELETE FROM audit_logs 
WHERE action = 'commission_settings.updated';
```

**⚠️ WARNING**: Only do database cleanup if you're certain you won't need the settings again.

## Fixed Constants (Legacy Behavior)

When commission settings are disabled, these constants are used:

```typescript
// Platform fees
const FIXED_PLATFORM_FEE_PERCENTAGE = 0.10; // 10%
const FIXED_FEE_CENTS = 30; // $0.30
const MINIMUM_FEE_CENTS = 50; // $0.50

// Athlete fees  
const FIXED_ATHLETE_FEE_PERCENTAGE = 0; // 0%
const FIXED_ATHLETE_FEE_FLAT_CENTS = 0; // $0.00

// Booking request fees
const FIXED_BOOKING_REQUEST_FEE = 0.05; // 5%
```

## Testing Rollback

### 1. Feature Flag Test
```bash
# Set flag
export ENABLE_COMMISSION_SETTINGS=false

# Test checkout
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"listing_id":"test","coach_id":"test"}'

# Check logs for "Commission settings disabled, using legacy behavior"
```

### 2. Manual Verification
- Create a $100 booking
- Verify platform takes exactly $10 (10% + $0.30, minimum $0.50)
- Verify no athlete service fees are added
- Verify coach receives exactly $90

### 3. Database Verification
```sql
-- Check if settings exist but are ignored
SELECT setting_key, setting_value 
FROM admin_settings 
WHERE category = 'commission';

-- Verify no new audit logs are created for commission updates
SELECT COUNT(*) 
FROM audit_logs 
WHERE action = 'commission_settings.updated'
AND created_at > NOW() - INTERVAL '1 hour';
```

## Re-enabling Commission Settings

To re-enable commission settings:

1. **Set environment variable:**
   ```bash
   ENABLE_COMMISSION_SETTINGS=true
   ```

2. **Verify settings exist in database:**
   ```bash
   npx tsx scripts/verify-commission-settings-seed.ts
   ```

3. **Test commission calculations work**

## Support

If you encounter issues during rollback:

1. Check application logs for error messages
2. Verify environment variable is properly set
3. Restart the application after changing environment variables
4. Run the verification script to check database state

## Files Modified by Commission Settings

**Extended (safe to revert):**
- `lib/stripeFees.ts` - Added new functions, existing functions preserved
- `app/api/checkout/route.ts` - Added feature flag with fallback
- `app/api/requests/[id]/accept/route.ts` - Added feature flag with fallback  
- `app/api/stripe/webhook/route.ts` - Added verification, existing logic preserved

**Database tables used (existing):**
- `admin_settings` - Used existing table, no new tables created
- `audit_logs` - Used existing table, no new tables created

**New files (safe to remove):**
- `scripts/verify-commission-settings-seed.ts`
- `scripts/test-fee-calculations.ts`
- `COMMISSION_SETTINGS_MANUAL_VERIFICATION.md`
- `COMMISSION_SETTINGS_ROLLBACK.md` (this file)

The implementation was designed to be **non-breaking** and **easily reversible** with the feature flag as the primary rollback mechanism.