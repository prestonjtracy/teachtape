import { createClient } from "@/lib/supabase/server";

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    return null;
  }
}

export async function getProfileById(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = createClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error fetching profile by id:', error);
    return null;
  }
}