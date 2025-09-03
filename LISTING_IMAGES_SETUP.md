# Listing Images Storage Setup

## Issue
You're getting "Upload failed: new row violates row-level security policy" because the `listing-images` storage bucket needs proper RLS policies.

## Quick Fix
Please run these SQL commands in your Supabase dashboard (SQL Editor):

```sql
-- Allow authenticated users to upload listing images
CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);

-- Allow anyone to view listing images (public access)
CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

-- Allow authenticated users to update listing images
CREATE POLICY "Authenticated users can update listing images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete listing images  
CREATE POLICY "Authenticated users can delete listing images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);
```

## How to Apply These Policies

1. Go to your Supabase dashboard
2. Navigate to "SQL Editor"
3. Copy and paste the SQL commands above
4. Click "Run" to execute them

After running these commands, the image upload should work properly.

## Multiple Images

Currently, the implementation supports **one image per listing**. If you want multiple images per listing, we would need to:

1. Create a separate `listing_images` table with relationships
2. Update the UI to handle multiple image uploads
3. Modify the ListingCard to show an image carousel

Would you like me to implement multiple images support, or is one image per listing sufficient for now?