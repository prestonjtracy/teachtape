# Supabase Storage Setup for Avatar Upload

## Required: Create the 'avatars' Storage Bucket

You need to create a public storage bucket in your Supabase dashboard for avatar uploads to work.

### Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your TeachTape project

2. **Create the Storage Bucket**
   - Go to "Storage" in the left sidebar
   - Click "Create bucket"
   - Bucket name: `avatars`
   - Make it **Public** (check the "Public bucket" option)
   - Click "Create bucket"

3. **Set Storage Policy (if needed)**
   If you need more granular control, you can set up RLS policies:
   
   ```sql
   -- Allow users to upload their own avatars
   CREATE POLICY "Users can upload own avatar" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'avatars' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   
   -- Allow users to update their own avatars
   CREATE POLICY "Users can update own avatar" ON storage.objects
   FOR UPDATE WITH CHECK (
     bucket_id = 'avatars' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   
   -- Allow everyone to view avatars (public bucket)
   CREATE POLICY "Anyone can view avatars" ON storage.objects
   FOR SELECT USING (bucket_id = 'avatars');
   ```

### File Structure
The avatar uploader will save files as:
```
avatars/{user_id}/profile.{extension}
```

For example:
- `avatars/123e4567-e89b-12d3-a456-426614174000/profile.jpg`
- `avatars/987fcdeb-51a2-43d7-8f9e-123456789abc/profile.png`

### That's it!
Once the bucket is created, the avatar upload functionality will work automatically. The AvatarUploader component handles:
- ✅ File validation (JPG, PNG, WebP, max 5MB)
- ✅ Upload to the correct path with upsert
- ✅ Getting the public URL
- ✅ Updating the profile automatically
- ✅ Drag & drop support
- ✅ Live preview
- ✅ Error handling