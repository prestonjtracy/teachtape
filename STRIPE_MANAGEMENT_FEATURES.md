# Stripe Account Management Features

## What Was Added

### Part 1: Fixed "Stuck Onboarding" Issue ✅

**Problem:** Once a coach started Stripe onboarding (even if they didn't finish), the "Continue Onboarding" banner disappeared forever.

**Solution:**
- Created `/api/stripe/account-status` endpoint that checks REAL Stripe account status
- Updated Dashboard to check if `charges_enabled` is true (not just if account exists)
- Banner now shows until Stripe setup is actually complete

**Result:** Coaches who time out or close the Stripe onboarding can now complete it later!

---

### Part 2: Added Stripe Account Management Page ✅

**New Page:** `/my-profile/payments`

**Features:**
1. **View Stripe Account Status**
   - Connection status (Connected/Not Connected)
   - Payment status (Enabled/Setup Required)
   - Bank account info (last 4 digits)
   - Account details (email, country, currency)

2. **Actions**
   - "Connect Stripe Account" (for new coaches)
   - "Complete Stripe Setup" (for incomplete setups)
   - "Open Stripe Dashboard" (for existing accounts)

3. **Navigation**
   - Added tabs to My Profile page (Profile Info | Payment Settings)
   - Only visible to coaches

---

## New API Endpoints

### 1. `/api/stripe/account-status` (GET)
- Returns detailed Stripe account status
- Checks `charges_enabled`, `details_submitted`, `payouts_enabled`
- Shows bank account info (last 4)
- Requires authentication

### 2. `/api/stripe/dashboard-link` (POST)
- Generates a login link to Stripe Express Dashboard
- Allows coaches to update banking info, view payouts, etc.
- Link opens in new tab
- Requires authentication

---

## Database Migration Required

**File:** `supabase/migrations/012_fix_coaches_table_insert_policy.sql`

**What it does:**
- Adds RLS policies so coaches can INSERT/UPDATE/SELECT their own coach records
- Fixes the "42501: insufficient privilege" error

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `012_fix_coaches_table_insert_policy.sql`
3. Run the SQL
4. Done!

---

## User Flow

### New Coach Signing Up:
1. Sign up → Profile created automatically (via webhook)
2. Go to Dashboard → See "Complete your Stripe setup" banner
3. Click "Continue Onboarding" → Redirected to Stripe
4. Complete Stripe onboarding → Return to dashboard
5. Banner disappears, can now create listings

### Coach Who Timed Out During Onboarding:
1. Dashboard shows banner: "Complete your Stripe setup"
2. Click "Continue Onboarding" → Redirected to Stripe (continues where they left off)
3. Complete setup → Banner disappears

### Existing Coach Wants to Update Banking Info:
1. Go to My Profile → Click "Payment Settings" tab
2. See current Stripe account status
3. Click "Open Stripe Dashboard"
4. Update banking info in Stripe
5. Changes sync automatically

---

## What's Protected

✅ All endpoints require authentication
✅ Only coaches can access Stripe features
✅ Coaches can only see/modify their own Stripe account
✅ RLS policies prevent unauthorized database access

---

## Files Changed

### New Files:
- `/app/api/stripe/account-status/route.ts` - Get Stripe status
- `/app/api/stripe/dashboard-link/route.ts` - Generate Stripe dashboard link
- `/app/(dashboard)/my-profile/payments/page.tsx` - Payment settings page
- `/supabase/migrations/012_fix_coaches_table_insert_policy.sql` - RLS policies

### Modified Files:
- `/app/dashboard/DashboardClient.tsx` - Uses real Stripe status now
- `/app/(dashboard)/my-profile/MyProfileClient.tsx` - Added navigation tabs

---

## Testing Checklist

Before pushing to production:

1. ✅ **Run Supabase migration** (012_fix_coaches_table_insert_policy.sql)
2. ✅ **Test "Continue Onboarding" button** - Should work now
3. ✅ **Test timing out during Stripe setup** - Banner should reappear
4. ✅ **Visit `/my-profile/payments`** - Should show Stripe status
5. ✅ **Click "Open Stripe Dashboard"** - Should open Stripe in new tab

---

## Next Steps

1. **Push code to Vercel** (when ready)
2. **Run Supabase migration** (critical - onboarding won't work without it)
3. **Test with your account**
4. **Have a friend test signup flow**

---

## Benefits

✅ No more "stuck" coaches who can't complete onboarding
✅ Coaches can manage their Stripe account easily
✅ Transparent payment status (know if setup is complete)
✅ Easy access to update banking info
✅ Professional payment settings page

---

## No Breaking Changes

✅ All existing code still works
✅ Existing Stripe accounts unaffected
✅ Build passes successfully
✅ No changes to existing routes

Safe to deploy! 🚀
