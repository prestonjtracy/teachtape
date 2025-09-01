import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MyProfileClient from './MyProfileClient';

export default async function MyProfilePage() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/my-profile');
  }

  return <MyProfileClient />;
}