import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitization";

export const dynamic = 'force-dynamic';

const UpdateCaptionSchema = z.object({
  caption: z.string()
    .max(500, "Caption too long")
    .transform(val => sanitizeText(val)) // XSS protection
    .optional(),
});

const UpdateCaptionParamsSchema = z.object({
  id: z.string().uuid("Invalid image ID"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 [PATCH /api/coach-gallery/[id]/caption] Request received');
  
  try {
    // Validate params
    const validatedParams = UpdateCaptionParamsSchema.parse(params);
    const body = await req.json();
    
    // Validate input
    const validatedData = UpdateCaptionSchema.parse(body);
    console.log('✅ [PATCH /api/coach-gallery/[id]/caption] Input validated:', {
      image_id: validatedParams.id,
      has_caption: !!validatedData.caption
    });

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [PATCH /api/coach-gallery/[id]/caption] User not authenticated:', userError);
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
      console.error('❌ [PATCH /api/coach-gallery/[id]/caption] Profile not found:', profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Verify user is a coach
    if (profile.role !== 'coach') {
      console.error('❌ [PATCH /api/coach-gallery/[id]/caption] User is not a coach:', profile.role);
      return NextResponse.json(
        { error: "Only coaches can update gallery captions" },
        { status: 403 }
      );
    }

    // Get the gallery image to verify ownership
    const { data: galleryImage, error: imageError } = await supabase
      .from('coach_gallery')
      .select('id, coach_id, caption')
      .eq('id', validatedParams.id)
      .single();

    if (imageError || !galleryImage) {
      console.error('❌ [PATCH /api/coach-gallery/[id]/caption] Gallery image not found:', imageError);
      return NextResponse.json(
        { error: "Gallery image not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (galleryImage.coach_id !== profile.id) {
      console.error('❌ [PATCH /api/coach-gallery/[id]/caption] User does not own this image');
      return NextResponse.json(
        { error: "You can only update captions for your own gallery images" },
        { status: 403 }
      );
    }

    console.log('✅ [PATCH /api/coach-gallery/[id]/caption] Image found and ownership verified:', {
      image_id: galleryImage.id,
      coach_id: galleryImage.coach_id
    });

    // Update the caption
    const { data: updatedImage, error: updateError } = await supabase
      .from('coach_gallery')
      .update({ caption: validatedData.caption || null })
      .eq('id', validatedParams.id)
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

    if (updateError || !updatedImage) {
      console.error('❌ [PATCH /api/coach-gallery/[id]/caption] Failed to update caption:', updateError);
      return NextResponse.json(
        { error: "Failed to update caption" },
        { status: 500 }
      );
    }

    console.log('✅ [PATCH /api/coach-gallery/[id]/caption] Caption updated successfully');

    return NextResponse.json({
      success: true,
      image: updatedImage,
      message: 'Caption updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [PATCH /api/coach-gallery/[id]/caption] Validation error:', error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('❌ [PATCH /api/coach-gallery/[id]/caption] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}