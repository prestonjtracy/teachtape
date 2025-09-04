import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AthleteRequestsList from "@/components/dashboard/AthleteRequestsList";

export default async function AthleteRequestsPage() {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/auth/login");
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    redirect("/auth/login");
  }

  // Only athletes can access this page
  if (profile.role !== 'athlete') {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Requests</h1>
          <p className="mt-2 text-gray-600">
            Track your coaching session requests and their status.
          </p>
        </div>

        <AthleteRequestsList athleteId={profile.id} />
      </div>
    </div>
  );
}