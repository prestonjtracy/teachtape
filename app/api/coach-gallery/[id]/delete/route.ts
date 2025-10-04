import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const DeleteImageParamsSchema = z.object({
  id: z.string().uuid("Invalid image ID"),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 [DELETE /api/coach-gallery/[id]/delete] Request received');
  
  try {
    // Validate params
    const validatedParams = DeleteImageParamsSchema.parse(params);
    console.log('✅ [DELETE /api/coach-gallery/[id]/delete] Params validated:', validatedParams);

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [DELETE /api/coach-gallery/[id]/delete] User not authenticated:', userError);
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
      console.error('❌ [DELETE /api/coach-gallery/[id]/delete] Profile not found:', profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Verify user is a coach
    if (profile.role !== 'coach') {
      console.error('❌ [DELETE /api/coach-gallery/[id]/delete] User is not a coach:', profile.role);
      return NextResponse.json(
        { error: "Only coaches can delete gallery images" },
        { status: 403 }
      );
    }

    // Get the gallery image to verify ownership and get image_url
    const { data: galleryImage, error: imageError } = await supabase
      .from('coach_gallery')
      .select('id, coach_id, image_url, position')
      .eq('id', validatedParams.id)
      .single();

    if (imageError || !galleryImage) {
      console.error('❌ [DELETE /api/coach-gallery/[id]/delete] Gallery image not found:', imageError);
      return NextResponse.json(
        { error: "Gallery image not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (galleryImage.coach_id !== profile.id) {
      console.error('❌ [DELETE /api/coach-gallery/[id]/delete] User does not own this image');
      return NextResponse.json(
        { error: "You can only delete your own gallery images" },
        { status: 403 }
      );
    }

    // Extract file path from URL for storage deletion
    const url = new URL(galleryImage.image_url);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/coach-gallery\/(.+)$/);
    const filePath = pathMatch ? pathMatch[1] : null;

    console.log('✅ [DELETE /api/coach-gallery/[id]/delete] Image found and ownership verified:', {
      image_id: galleryImage.id,
      coach_id: galleryImage.coach_id,
      file_path: filePath
    });

    // Delete from database first (let RLS handle authorization)
    const { error: dbError } = await supabase
      .from('coach_gallery')
      .delete()
      .eq('id', validatedParams.id);

    if (dbError) {
      console.error('❌ [DELETE /api/coach-gallery/[id]/delete] Database deletion failed:', dbError);
      return NextResponse.json(
        { error: "Failed to delete gallery image from database" },
        { status: 500 }
      );
    }

    // Delete from storage (if we have the file path)
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('coach-gallery')
        .remove([filePath]);

      if (storageError) {
        console.warn('⚠️ [DELETE /api/coach-gallery/[id]/delete] Storage deletion failed:', storageError);
        // Don't fail the request if storage deletion fails - the main deletion succeeded
      } else {
        console.log('✅ [DELETE /api/coach-gallery/[id]/delete] File deleted from storage');
      }
    }

    // Reorder remaining images to fill the gap
    const { data: remainingImages, error: reorderFetchError } = await supabase
      .from('coach_gallery')
      .select('id, position')
      .eq('coach_id', profile.id)
      .order('position', { ascending: true });

    if (reorderFetchError) {
      console.warn('⚠️ [DELETE /api/coach-gallery/[id]/delete] Failed to fetch remaining images for reordering:', reorderFetchError);
    } else if (remainingImages && remainingImages.length > 0) {
      // Update positions to be sequential (0, 1, 2, ...)
      for (let i = 0; i < remainingImages.length; i++) {
        if (remainingImages[i].position !== i) {
          const { error: updateError } = await supabase
            .from('coach_gallery')
            .update({ position: i })
            .eq('id', remainingImages[i].id);

          if (updateError) {
            console.warn('⚠️ [DELETE /api/coach-gallery/[id]/delete] Failed to update position for image:', remainingImages[i].id);
          }
        }
      }
      console.log('✅ [DELETE /api/coach-gallery/[id]/delete] Remaining images reordered');
    }

    console.log('✅ [DELETE /api/coach-gallery/[id]/delete] Gallery image deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Gallery image deleted successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [DELETE /api/coach-gallery/[id]/delete] Validation error:', error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('❌ [DELETE /api/coach-gallery/[id]/delete] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}