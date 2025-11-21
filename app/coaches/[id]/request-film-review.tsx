"use client";

import { useState } from "react";

interface RequestFilmReviewProps {
  listingId: string;
  coachId: string;
  listingTitle: string;
  priceCents: number;
  turnaroundHours: number;
  coachName: string;
}

export default function RequestFilmReview({
  listingId,
  coachId,
  listingTitle,
  priceCents,
  turnaroundHours,
  coachName,
}: RequestFilmReviewProps) {
  const [filmUrl, setFilmUrl] = useState("");
  const [athleteNotes, setAthleteNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      const allowedHosts = [
        "hudl.com",
        "www.hudl.com",
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "vimeo.com",
        "www.vimeo.com",
        "player.vimeo.com",
      ];
      return allowedHosts.some(
        (host) =>
          parsed.hostname === host || parsed.hostname.endsWith("." + host)
      );
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!filmUrl.trim()) {
      setError("Please enter your video URL");
      return;
    }

    if (!validateUrl(filmUrl)) {
      setError("Video URL must be from Hudl, YouTube, or Vimeo");
      return;
    }

    if (athleteNotes.length > 2000) {
      setError("Notes are too long (max 2000 characters)");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/film-review/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          coach_id: coachId,
          film_url: filmUrl,
          athlete_notes: athleteNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.details
            ? Array.isArray(data.details)
              ? data.details.join(", ")
              : data.details
            : data.error || "Failed to create checkout"
        );
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#123C7A] mb-2">
          Request Film Review
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{listingTitle}</span>
          <span className="text-lg font-bold text-[#FF5A1F]">
            ${(priceCents / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Video URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={filmUrl}
            onChange={(e) => setFilmUrl(e.target.value)}
            placeholder="https://hudl.com/video/..."
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                       placeholder:text-gray-400"
          />
          <p className="mt-1 text-xs text-gray-500">
            Hudl, YouTube, or Vimeo links only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Focus Areas / Questions (Optional)
          </label>
          <textarea
            value={athleteNotes}
            onChange={(e) => setAthleteNotes(e.target.value)}
            placeholder="What would you like the coach to focus on? Any specific questions?"
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                       placeholder:text-gray-400 resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 text-right">
            {athleteNotes.length}/2000 characters
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !filmUrl.trim()}
          className="w-full bg-[#FF5A1F] text-white font-semibold py-3 px-6 rounded-lg
                     hover:bg-[#E44F1B] focus:ring-2 focus:ring-[#FF5A1F] focus:ring-offset-2
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Request Review - ${(priceCents / 100).toFixed(2)}
            </span>
          )}
        </button>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-[#123C7A] mb-2">
            How It Works
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-start">
              <span className="text-[#FF5A1F] mr-2">1.</span>
              Submit your request with payment
            </li>
            <li className="flex items-start">
              <span className="text-[#FF5A1F] mr-2">2.</span>
              {coachName} will accept within 24 hours (or you get a full refund)
            </li>
            <li className="flex items-start">
              <span className="text-[#FF5A1F] mr-2">3.</span>
              Receive your personalized review within {turnaroundHours} hours
            </li>
          </ul>
        </div>
      </form>
    </div>
  );
}
