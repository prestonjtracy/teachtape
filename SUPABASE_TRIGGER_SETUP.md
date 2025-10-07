# Supabase Auto-Profile Trigger Setup

## Problem
Users can sign up in Supabase Auth, but don't get a profile record created automatically in the `profiles` table.

## Solution (2 Parts)

### Part 1: Fix Existing Users (Run SQL)

**In Supabase Dashboard → SQL Editor:**

Run this SQL (from `supabase/migrations/010_fix_missing_profiles.sql`):

```sql
-- Create profiles for existing users without them
INSERT INTO public.profiles (auth_user_id, role, full_name)
SELECT
  u.id,
  'athlete' AS role,
  COALESCE(u.raw_user_meta_data->>'full_name', NULL) AS full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_user_id = u.id
WHERE p.id IS NULL
ON CONFLICT DO NOTHING;

-- Verify it worked
SELECT
  u.email,
  p.role,
  CASE WHEN p.id IS NULL THEN '❌ MISSING' ELSE '✅ HAS PROFILE' END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_user_id = u.id;
```

**This fixes Preston's current account and any other users missing profiles.**

---

### Part 2: Auto-Create Profiles for Future Users (Database Webhooks)

Unfortunately, Supabase doesn't allow direct triggers on `auth.users` via SQL for security reasons.

**You have 3 options:**

#### **Option A: Use Supabase Auth Hooks (Recommended)**

1. Go to **Supabase Dashboard** → **Authentication** → **Hooks**
2. Enable **"Send auth events to a webhook"**
3. Create an API endpoint in your app to handle new user creation
4. When webhook receives `user.created` event → create profile

*This requires code changes - let me know if you want me to implement this*

---

#### **Option B: Manual Database Trigger (Supabase CLI Required)**

You need to use the Supabase CLI locally to create the trigger:

1. Install Supabase CLI: `npm install -g supabase`
2. Run: `supabase db reset --linked`
3. This will apply all migrations including the trigger

*Only works if you have local Supabase setup*

---

#### **Option C: Use Supabase Dashboard Database Triggers (If Available)**

Some Supabase projects have direct trigger access:

1. Go to **Database** → **Triggers**
2. Click **"New trigger"**
3. **Trigger name:** `on_auth_user_created`
4. **Table:** `auth.users`
5. **Events:** `Insert`
6. **Type:** `After`
7. **Function:** Create new function:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (auth_user_id, role)
     VALUES (NEW.id, 'athlete');
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

---

## Quick Fix for Now (Manual)

**For Preston's account right now:**

Run `010_fix_missing_profiles.sql` in SQL Editor - **this will fix your account immediately.**

Then run `011_upgrade_preston_to_coach.sql` to become a coach.

**For future users:**

We'll need to implement Option A (Auth Hooks) with a small API endpoint. Let me know if you want me to create that!

---

## Test After Running SQL

1. Refresh https://teachtapesports.com
2. Click "Dashboard"
3. Should work now! ✅
