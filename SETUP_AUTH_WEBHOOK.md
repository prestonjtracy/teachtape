# Setup Supabase Auth Webhook for Automatic Profile Creation

## What This Does

When a new user signs up, Supabase will automatically call your API endpoint to create their profile. This ensures **every new coach/athlete gets a profile** without manual intervention.

---

## Step 1: Deploy the Code to Vercel

The webhook endpoint is already created at: `/app/api/auth/hooks/route.ts`

**You need to push this to Vercel:**

```bash
git add .
git commit -m "feat: add auth webhook for automatic profile creation"
git push
```

Wait for Vercel deployment to complete (~2 minutes).

---

## Step 2: Configure Supabase Auth Hook

### A. Get Your Webhook URL

Your webhook URL will be:
```
https://teachtapesports.com/api/auth/hooks
```

### B. Set Up the Hook in Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your **TeachTape project**
3. Go to **Authentication** → **Hooks** (in left sidebar)
4. Find **"Send a webhook when users sign up"** or **"Database Webhooks"**
5. Click **"Add a new hook"** or **"Enable Hook"**

**Configure the hook:**
- **Hook name**: `Create User Profile`
- **Event**: `auth.user.created` or just `INSERT` on `auth.users`
- **Type**: `HTTP Request` or `Webhook`
- **URL**: `https://teachtapesports.com/api/auth/hooks`
- **Method**: `POST`
- **Headers** (optional):
  ```
  Content-Type: application/json
  ```

6. Click **"Save"** or **"Create"**

---

## Step 3: Test It Works

### Option A: Create a Test User in Supabase

1. In Supabase Dashboard → **Authentication** → **Users**
2. Click **"Invite user"** or **"Add user"**
3. Enter a test email: `test-coach@example.com`
4. Check if profile was created:

```sql
SELECT
  u.email,
  p.id as profile_id,
  p.role,
  CASE WHEN p.id IS NULL THEN '❌ FAILED' ELSE '✅ SUCCESS' END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_user_id = u.id
WHERE u.email = 'test-coach@example.com';
```

### Option B: Test Signup Flow

1. Go to https://teachtapesports.com/auth/signup
2. Create a test account
3. Check if you can access the dashboard immediately
4. If it works - **the webhook is set up correctly!** ✅

---

## Step 4: (Optional) Add Webhook Secret for Security

For extra security, add a webhook secret:

### A. Generate a Secret

```bash
# Generate a random secret
openssl rand -hex 32
```

### B. Add to Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add:
   - **Key**: `SUPABASE_WEBHOOK_SECRET`
   - **Value**: `[your generated secret]`
   - **Environment**: All (Production, Preview, Development)
3. Click **"Save"**
4. **Redeploy** your project

### C. Configure in Supabase Webhook

In the Supabase webhook settings, add a header:
- **Header name**: `x-supabase-signature`
- **Header value**: `[your generated secret]`

---

## Troubleshooting

### Check Webhook Logs

**In Vercel:**
1. Go to your deployment
2. Click **"Functions"** or **"Logs"**
3. Look for `/api/auth/hooks` requests
4. Check if they're successful (200) or failing

**In Supabase:**
1. Go to **Logs** in Supabase Dashboard
2. Look for webhook delivery logs
3. Check for errors

### Test Webhook Manually

Test if the endpoint is accessible:

```bash
curl https://teachtapesports.com/api/auth/hooks
```

Should return:
```json
{
  "status": "ok",
  "endpoint": "Supabase Auth Webhook Handler"
}
```

### Common Issues

**Issue**: "Webhook failing with 404"
- **Fix**: Make sure you deployed to Vercel first

**Issue**: "Profile not being created"
- **Fix**: Check Vercel function logs for errors
- Check if webhook is configured for the right event (`auth.user.created`)

**Issue**: "Webhook timing out"
- **Fix**: Check Vercel function timeout settings (should be at least 10s)

---

## Summary

1. ✅ Code is ready (already created)
2. 📤 **Push to Vercel** (`git push`)
3. ⚙️ **Configure Supabase webhook** (Dashboard → Auth → Hooks)
4. ✅ **Test with new signup**
5. 🎉 **Done!** All future signups will automatically get profiles

---

## What Happens Now

**Before this fix:**
- User signs up → Auth account created ✅
- No profile created ❌
- Dashboard doesn't work ❌

**After this fix:**
- User signs up → Auth account created ✅
- Supabase calls your webhook → Profile auto-created ✅
- Dashboard works immediately ✅
- Users can choose to become coaches later ✅

---

Ready to deploy? Just:
```bash
git add .
git commit -m "feat: add auth webhook for automatic profile creation"
git push
```

Then set up the Supabase webhook and you're done!
