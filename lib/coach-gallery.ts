import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_GALLERY_IMAGES = 5;
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Validation schemas
export const UploadGalleryImageSchema = z.object({
  caption: z.string().max(500, "Caption too long").optional(),
});

export const DeleteImageParamsSchema = z.object({
  id: z.string().uuid("Invalid image ID"),
});

export const ReorderGallerySchema = z.object({
  orderedIds: z.array(z.string().uuid("Invalid image ID"))
    .min(1, "At least one image ID required")
    .max(MAX_GALLERY_IMAGES, `Maximum ${MAX_GALLERY_IMAGES} images allowed`),
});

export const GetGalleryParamsSchema = z.object({
  coachId: z.string().uuid("Invalid coach ID").optional(),
});

// Types
export interface GalleryImage {
  id: string;
  coach_id: string;
  image_url: string;
  caption: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CoachProfile {
  id: string;
  role: string;
}

// Helper functions
export async function validateCoachAuth(): Promise<{ profile: CoachProfile; error?: string; status?: number }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { 
      profile: null as any,
      error: "Authentication required",
      status: 401
    };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      profile: null as any,
      error: "Profile not found",
      status: 404
    };
  }

  // Verify user is a coach
  if (profile.role !== 'coach') {
    return {
      profile: null as any,
      error: "Only coaches can manage gallery images",
      status: 403
    };
  }

  return { profile };
}

export async function validateFileUpload(file: File): Promise<{ error?: string; status?: number }> {
  if (!file) {
    return { error: "File is required", status: 400 };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "File size must be less than 5MB", status: 400 };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { error: "File type must be JPG, PNG, or WebP", status: 400 };
  }

  return {};
}

export async function checkGalleryLimit(coachId: string): Promise<{ error?: string; status?: number; count?: number }> {
  const supabase = await createClient();
  
  const { data: existingImages, error: countError } = await supabase
    .from('coach_gallery')
    .select('id')
    .eq('coach_id', coachId);

  if (countError) {
    return { error: "Failed to check existing images", status: 500 };
  }

  const count = existingImages?.length || 0;
  
  if (count >= MAX_GALLERY_IMAGES) {
    return { 
      error: `Max ${MAX_GALLERY_IMAGES} photos allowed`, 
      status: 400,
      count 
    };
  }

  return { count };
}

export async function validateImageOwnership(imageId: string, coachId: string): Promise<{
  image?: GalleryImage;
  error?: string;
  status?: number;
}> {
  const supabase = await createClient();

  const { data: galleryImage, error: imageError } = await supabase
    .from('coach_gallery')
    .select('*')
    .eq('id', imageId)
    .single();

  if (imageError || !galleryImage) {
    return { error: "Gallery image not found", status: 404 };
  }

  if (galleryImage.coach_id !== coachId) {
    return { 
      error: "You can only manage your own gallery images", 
      status: 403 
    };
  }

  return { image: galleryImage };
}

export function extractFilePathFromUrl(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/coach-gallery\/(.+)$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}

export function generateFileName(originalName: string): string {
  const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${crypto.randomUUID()}.${fileExtension}`;
}

// Error response helper
export interface ApiError {
  error: string;
  details?: any;
}

export function createErrorResponse(error: string, status: number, details?: any) {
  return {
    error,
    ...(details && { details })
  };
}