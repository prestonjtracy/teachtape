"use client";

import { useState } from "react";

export default function AcceptDeclineButtons({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/film-review/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept");
      }

      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline? This will refund the athlete and you won't be able to complete this review.")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/film-review/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to decline");
      }

      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="flex-1 bg-[#FF5A1F] text-white font-medium py-2.5 px-4 rounded-lg
                     hover:bg-[#E44F1B] focus:ring-2 focus:ring-[#FF5A1F] focus:ring-offset-2
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Accept"
          )}
        </button>
        <button
          onClick={handleDecline}
          disabled={loading}
          className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 px-4 rounded-lg
                     hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          Decline
        </button>
      </div>
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
