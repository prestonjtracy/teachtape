import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ReorderGallerySchema = z.object({
  orderedIds: z.array(z.string().uuid("Invalid image ID")).min(1, "At least one image ID required").max(5, "Maximum 5 images allowed"),
});

export async function PUT(req: NextRequest) {
  console.log('🔍 [PUT /api/coach-gallery/reorder] Request received');
  
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = ReorderGallerySchema.parse(body);
    console.log('✅ [PUT /api/coach-gallery/reorder] Input validated:', {
      image_count: validatedData.orderedIds.length,
      image_ids: validatedData.orderedIds
    });

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [PUT /api/coach-gallery/reorder] User not authenticated:', userError);
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
      console.error('❌ [PUT /api/coach-gallery/reorder] Profile not found:', profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Verify user is a coach
    if (profile.role !== 'coach') {
      console.error('❌ [PUT /api/coach-gallery/reorder] User is not a coach:', profile.role);
      return NextResponse.json(
        { error: "Only coaches can reorder gallery images" },
        { status: 403 }
      );
    }

    // Verify all images belong to this coach
    const { data: coachImages, error: verifyError } = await supabase
      .from('coach_gallery')
      .select('id, coach_id')
      .eq('coach_id', profile.id)
      .in('id', validatedData.orderedIds);

    if (verifyError) {
      console.error('❌ [PUT /api/coach-gallery/reorder] Failed to verify image ownership:', verifyError);
      return NextResponse.json(
        { error: "Failed to verify image ownership" },
        { status: 500 }
      );
    }

    if (!coachImages || coachImages.length !== validatedData.orderedIds.length) {
      console.error('❌ [PUT /api/coach-gallery/reorder] Some images not found or not owned by coach');
      return NextResponse.json(
        { error: "Some images not found or you don't have permission to reorder them" },
        { status: 403 }
      );
    }

    // Verify all images belong to the current coach
    const invalidImages = coachImages.filter(img => img.coach_id !== profile.id);
    if (invalidImages.length > 0) {
      console.error('❌ [PUT /api/coach-gallery/reorder] Images belong to different coach:', invalidImages);
      return NextResponse.json(
        { error: "You can only reorder your own gallery images" },
        { status: 403 }
      );
    }

    console.log('✅ [PUT /api/coach-gallery/reorder] Ownership verified:', {
      coach_id: profile.id,
      verified_images: coachImages.length
    });

    // Perform the reorder in a transaction-like manner
    // Update each image's position based on its index in the ordered array
    const updates = validatedData.orderedIds.map((imageId, index) => {
      return supabase
        .from('coach_gallery')
        .update({ position: index })
        .eq('id', imageId)
        .eq('coach_id', profile.id); // Double-check ownership in the update
    });

    // Execute all updates
    const updateResults = await Promise.all(updates);
    
    // Check if any updates failed
    const failedUpdates = updateResults.filter(result => result.error);
    if (failedUpdates.length > 0) {
      console.error('❌ [PUT /api/coach-gallery/reorder] Some position updates failed:', failedUpdates);
      return NextResponse.json(
        { error: "Failed to update some image positions" },
        { status: 500 }
      );
    }

    // Fetch the updated images to return
    const { data: updatedImages, error: fetchError } = await supabase
      .from('coach_gallery')
      .select(`
        id,
        coach_id,
        image_url,
        caption,
        position,
        created_at,
        updated_at
      `)
      .eq('coach_id', profile.id)
      .order('position', { ascending: true });

    if (fetchError) {
      console.error('❌ [PUT /api/coach-gallery/reorder] Failed to fetch updated images:', fetchError);
      return NextResponse.json(
        { error: "Reorder completed but failed to fetch updated images" },
        { status: 500 }
      );
    }

    console.log('✅ [PUT /api/coach-gallery/reorder] Gallery reordered successfully:', {
      total_images: updatedImages?.length || 0,
      new_order: updatedImages?.map(img => ({ id: img.id, position: img.position }))
    });

    return NextResponse.json({
      success: true,
      images: updatedImages,
      message: 'Gallery reordered successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [PUT /api/coach-gallery/reorder] Validation error:', error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('❌ [PUT /api/coach-gallery/reorder] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}