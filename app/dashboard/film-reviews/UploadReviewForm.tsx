"use client";

import { useState } from "react";

export default function UploadReviewForm({ bookingId }: { bookingId: string }) {
  const [reviewUrl, setReviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/film-review/upload-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          reviewDocumentUrl: reviewUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload review");
      }

      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Review Document URL
        </label>
        <input
          type="url"
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          placeholder="https://docs.google.com/..."
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                     placeholder:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-500">
          Google Docs, Dropbox, or PDF link
        </p>
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !reviewUrl}
        className="w-full bg-green-600 text-white font-medium py-2.5 px-4 rounded-lg
                   hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                   disabled:opacity-60 disabled:cursor-not-allowed
                   transition-all duration-200"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Submit Review
          </span>
        )}
      </button>
    </form>
  );
}
