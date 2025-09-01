import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MyListingsClient from './MyListingsClient';

export default async function MyListingsPage() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/my-listings');
  }

  return <MyListingsClient />;
}