"use client";

import { useState } from "react";

export default function TestBookingPage() {
  const [listingId, setListingId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listing_id: listingId,
          coach_id: coachId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test Booking Flow
          </h1>
          <p className="text-gray-600">
            Create a test checkout session with real IDs from your database
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="listingId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Listing ID (UUID)
              </label>
              <input
                type="text"
                id="listingId"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label
                htmlFor="coachId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Coach ID (UUID)
              </label>
              <input
                type="text"
                id="coachId"
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Checkout Session..." : "Create Test Booking"}
            </button>
          </form>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            How to Test:
          </h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Get real UUIDs from your Supabase database</li>
            <li>Fill in the form above</li>
            <li>Complete payment with test card: 4242 4242 4242 4242</li>
            <li>Check webhook logs and database for the new booking</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
