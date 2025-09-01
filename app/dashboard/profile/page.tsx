import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export default async function DashboardProfilePage() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/dashboard/profile');
  }

  // Get user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, bio, sport')
    .eq('auth_user_id', user.id)
    .single();

  // Get coach record if user is a coach
  let coach = null;
  if (profile?.role === 'coach') {
    const { data: coachData } = await supabase
      .from('coaches')
      .select('id, stripe_account_id')
      .eq('profile_id', profile.id)
      .single();
    
    coach = coachData;
  }

  return <ProfileClient profile={profile} coach={coach} />;
}