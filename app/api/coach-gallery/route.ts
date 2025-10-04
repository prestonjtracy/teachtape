import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const GetGalleryParamsSchema = z.object({
  coachId: z.string().uuid("Invalid coach ID").optional(),
});

export async function GET(req: NextRequest) {
  console.log('🔍 [GET /api/coach-gallery] Request received');
  
  try {
    const url = new URL(req.url);
    const coachId = url.searchParams.get('coachId');
    
    // Validate query parameters
    const validatedParams = GetGalleryParamsSchema.parse({ coachId });
    console.log('✅ [GET /api/coach-gallery] Params validated:', validatedParams);

    const supabase = createClient();

    // If no coachId provided, get current user's gallery
    let targetCoachId = validatedParams.coachId;
    
    if (!targetCoachId) {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ [GET /api/coach-gallery] User not authenticated:', userError);
        return NextResponse.json(
          { error: "Authentication required when not specifying coachId" },
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
        console.error('❌ [GET /api/coach-gallery] Profile not found:', profileError);
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        );
      }

      // Verify user is a coach
      if (profile.role !== 'coach') {
        console.error('❌ [GET /api/coach-gallery] User is not a coach:', profile.role);
        return NextResponse.json(
          { error: "Only coaches can view their own gallery without specifying coachId" },
          { status: 403 }
        );
      }

      targetCoachId = profile.id;
    }

    // Fetch gallery images
    const { data: galleryImages, error: fetchError } = await supabase
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
      .eq('coach_id', targetCoachId)
      .order('position', { ascending: true });

    if (fetchError) {
      console.error('❌ [GET /api/coach-gallery] Failed to fetch gallery images:', fetchError);
      return NextResponse.json(
        { error: "Failed to fetch gallery images" },
        { status: 500 }
      );
    }

    console.log('✅ [GET /api/coach-gallery] Gallery images fetched successfully:', {
      coach_id: targetCoachId,
      image_count: galleryImages?.length || 0
    });

    return NextResponse.json({
      success: true,
      images: galleryImages || [],
      count: galleryImages?.length || 0
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [GET /api/coach-gallery] Validation error:', error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request parameters",
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('❌ [GET /api/coach-gallery] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}