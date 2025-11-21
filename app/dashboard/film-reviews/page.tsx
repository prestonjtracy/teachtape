import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AcceptDeclineButtons from "./AcceptDeclineButtons";
import UploadReviewForm from "./UploadReviewForm";

export const dynamic = "force-dynamic";

function formatTimeRemaining(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) return "Overdue";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) {
    return `${hours}h remaining`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h remaining`;
}

export default async function FilmReviewsPage() {
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

  // Only coaches can access this page
  if (profile.role !== 'coach') {
    redirect("/dashboard");
  }

  // Fetch film review bookings for this coach with athlete info
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      *,
      listing:listings(title, turnaround_hours)
    `)
    .eq("booking_type", "film_review")
    .eq("coach_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading film reviews:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Film Reviews</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">Failed to load film reviews. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  const pending = bookings?.filter((b) => b.review_status === "pending_acceptance") || [];
  const accepted = bookings?.filter((b) => b.review_status === "accepted") || [];
  const completed = bookings?.filter((b) => b.review_status === "completed") || [];
  const declined = bookings?.filter((b) => b.review_status === "declined") || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#123C7A]">Film Reviews</h1>
          <p className="mt-2 text-gray-600">
            Manage athlete film review requests
          </p>
        </div>

        {/* Pending Acceptance */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
            Pending Your Approval ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-500">No pending requests</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pending.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Awaiting Approval
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#123C7A]">
                      {booking.listing?.title || "Film Review Request"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      From: {booking.athlete_email || booking.customer_email || "Unknown"}
                    </p>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Amount</span>
                      <span className="text-lg font-bold text-[#FF5A1F]">
                        ${(booking.amount_paid_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-medium text-gray-700">Turnaround</span>
                      <span className="text-sm text-gray-600">
                        {booking.listing?.turnaround_hours || 48}h
                      </span>
                    </div>
                  </div>

                  {booking.athlete_notes && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Athlete Notes:</p>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                        {booking.athlete_notes}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-4 p-2 bg-amber-50 rounded">
                    <strong>Note:</strong> Film link will be revealed after you accept
                  </div>

                  <AcceptDeclineButtons bookingId={booking.id} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* In Progress */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
            In Progress ({accepted.length})
          </h2>
          {accepted.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-500">No reviews in progress</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {accepted.map((booking) => {
                const isOverdue = booking.deadline_at && new Date(booking.deadline_at) < new Date();
                return (
                  <div
                    key={booking.id}
                    className={`bg-white rounded-xl shadow-sm ring-1 p-6 hover:shadow-md transition-shadow ${
                      isOverdue ? "ring-red-300" : "ring-black/5"
                    }`}
                  >
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          In Progress
                        </span>
                        <span className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-orange-600"}`}>
                          {booking.deadline_at ? formatTimeRemaining(booking.deadline_at) : "No deadline"}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#123C7A]">
                        {booking.listing?.title || "Film Review"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        For: {booking.athlete_email || booking.customer_email || "Unknown"}
                      </p>
                    </div>

                    <div className="mb-4">
                      <a
                        href={booking.film_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-[#123C7A] text-white text-sm font-medium rounded-lg hover:bg-[#0d2d5f] transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Watch Film
                      </a>
                    </div>

                    {booking.athlete_notes && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Focus Areas:</p>
                        <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                          {booking.athlete_notes}
                        </p>
                      </div>
                    )}

                    <UploadReviewForm bookingId={booking.id} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Completed */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
            Completed ({completed.length})
          </h2>
          {completed.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-500">No completed reviews yet</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completed.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6"
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                      <span className="text-sm text-gray-500">
                        {booking.review_completed_at
                          ? new Date(booking.review_completed_at).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#123C7A]">
                      {booking.listing?.title || "Film Review"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      For: {booking.athlete_email || booking.customer_email || "Unknown"}
                    </p>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-4">
                    <span className="text-sm font-medium text-gray-700">Earned</span>
                    <span className="text-lg font-bold text-green-600">
                      ${(booking.amount_paid_cents / 100).toFixed(2)}
                    </span>
                  </div>

                  <a
                    href={booking.review_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Review
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Declined */}
        {declined.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
              Declined ({declined.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {declined.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6 opacity-75"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Declined
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Request from {booking.athlete_email || booking.customer_email || "Unknown"} - Refund issued
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
