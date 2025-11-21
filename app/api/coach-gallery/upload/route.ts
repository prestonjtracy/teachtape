import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_DIMENSION = 4096; // 4096px max width/height
const MIN_IMAGE_DIMENSION = 100; // 100px min width/height

const UploadGalleryImageSchema = z.object({
  caption: z.string().max(500, "Caption too long").optional(),
});

export async function POST(req: NextRequest) {
  console.log('🔍 [POST /api/coach-gallery/upload] Request received');
  
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [POST /api/coach-gallery/upload] User not authenticated:', userError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [POST /api/coach-gallery/upload] Profile not found:', profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Verify user is a coach
    if (profile.role !== 'coach') {
      console.error('❌ [POST /api/coach-gallery/upload] User is not a coach:', profile.role);
      return NextResponse.json(
        { error: "Only coaches can upload gallery images" },
        { status: 403 }
      );
    }

    // Check current gallery count
    const { data: existingImages, error: countError } = await supabase
      .from('coach_gallery')
      .select('id')
      .eq('coach_id', profile.id);

    if (countError) {
      console.error('❌ [POST /api/coach-gallery/upload] Failed to check existing images:', countError);
      return NextResponse.json(
        { error: "Failed to check existing images" },
        { status: 500 }
      );
    }

    if (existingImages && existingImages.length >= 5) {
      console.error('❌ [POST /api/coach-gallery/upload] Max images reached');
      return NextResponse.json(
        { error: "Max 5 photos allowed" },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // SECURITY: Validate file content type (check magic bytes, not just MIME type)
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);

    // Check magic bytes for valid image formats
    const isValidJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF;
    const isValidPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47;
    const isValidWebP = uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46;

    if (!isValidJPEG && !isValidPNG && !isValidWebP) {
      return NextResponse.json(
        { error: "Invalid image file format. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Also check MIME type as secondary validation
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type must be JPG, PNG, or WebP" },
        { status: 400 }
      );
    }

    // SECURITY: Validate image dimensions to prevent abuse
    try {
      // Create a blob URL from the buffer
      const blob = new Blob([fileBuffer], { type: file.type });

      // Use Image API to get dimensions (works in Node.js 18+)
      const imageBitmap = await createImageBitmap(blob);
      const { width, height } = imageBitmap;
      imageBitmap.close(); // Clean up

      // Check minimum dimensions
      if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
        return NextResponse.json(
          {
            error: `Image dimensions too small. Minimum ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}px required.`,
            details: `Uploaded image: ${width}x${height}px`
          },
          { status: 400 }
        );
      }

      // Check maximum dimensions
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        return NextResponse.json(
          {
            error: `Image dimensions too large. Maximum ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px allowed.`,
            details: `Uploaded image: ${width}x${height}px`
          },
          { status: 400 }
        );
      }

      console.log(`✅ [POST /api/coach-gallery/upload] Image dimensions validated: ${width}x${height}px`);
    } catch (dimensionError) {
      console.error('❌ [POST /api/coach-gallery/upload] Failed to validate image dimensions:', dimensionError);
      return NextResponse.json(
        { error: "Failed to process image. File may be corrupted." },
        { status: 400 }
      );
    }

    // Validate caption if provided
    if (caption) {
      try {
        UploadGalleryImageSchema.parse({ caption });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: "Invalid caption",
              details: error.errors
            },
            { status: 400 }
          );
        }
      }
    }

    console.log('✅ [POST /api/coach-gallery/upload] Validation passed:', {
      coach_id: profile.id,
      file_size: file.size,
      file_type: file.type,
      has_caption: !!caption
    });

    // Determine correct file extension based on magic bytes
    let fileExtension = 'jpg';
    if (isValidPNG) {
      fileExtension = 'png';
    } else if (isValidWebP) {
      fileExtension = 'webp';
    }

    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `${profile.id}/${fileName}`;

    // Upload file to Supabase storage (fileBuffer already loaded above)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('coach-gallery')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError || !uploadData) {
      console.error('❌ [POST /api/coach-gallery/upload] File upload failed:', uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('coach-gallery')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('❌ [POST /api/coach-gallery/upload] Failed to get public URL');
      // Clean up uploaded file
      await supabase.storage.from('coach-gallery').remove([filePath]);
      return NextResponse.json(
        { error: "Failed to generate public URL" },
        { status: 500 }
      );
    }

    // Get next position
    const { data: lastImage } = await supabase
      .from('coach_gallery')
      .select('position')
      .eq('coach_id', profile.id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (lastImage?.position ?? -1) + 1;

    // Insert database record
    const { data: galleryImage, error: dbError } = await supabase
      .from('coach_gallery')
      .insert({
        coach_id: profile.id,
        image_url: urlData.publicUrl,
        caption: caption || null,
        position: nextPosition
      })
      .select(`
        id,
        coach_id,
        image_url,
        caption,
        position,
        created_at,
        updated_at
      `)
      .single();

    if (dbError || !galleryImage) {
      console.error('❌ [POST /api/coach-gallery/upload] Database insert failed:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('coach-gallery').remove([filePath]);
      return NextResponse.json(
        { error: "Failed to save image record" },
        { status: 500 }
      );
    }

    console.log('✅ [POST /api/coach-gallery/upload] Gallery image uploaded successfully:', galleryImage.id);

    return NextResponse.json({
      success: true,
      image: galleryImage,
      message: 'Gallery image uploaded successfully'
    });

  } catch (error) {
    console.error('❌ [POST /api/coach-gallery/upload] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}