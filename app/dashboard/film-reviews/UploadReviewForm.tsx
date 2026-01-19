"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewContent {
  overallAssessment: string;
  strengths: string;
  areasForImprovement: string;
  recommendedDrills: string;
  keyTimestamps: string;
  supplementalDocUrl: string;
}

export default function UploadReviewForm({ bookingId }: { bookingId: string }) {
  const [reviewContent, setReviewContent] = useState<ReviewContent>({
    overallAssessment: "",
    strengths: "",
    areasForImprovement: "",
    recommendedDrills: "",
    keyTimestamps: "",
    supplementalDocUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const handleChange = (field: keyof ReviewContent, value: string) => {
    setReviewContent(prev => ({ ...prev, [field]: value }));
  };

  const getCharCount = (field: keyof ReviewContent) => reviewContent[field].length;

  const isValid = () => {
    return (
      reviewContent.overallAssessment.length >= 200 &&
      reviewContent.strengths.length >= 100 &&
      reviewContent.areasForImprovement.length >= 100 &&
      reviewContent.recommendedDrills.length >= 100
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid()) {
      setError("Please meet all minimum character requirements for required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/film-review/upload-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          reviewContent: {
            overallAssessment: reviewContent.overallAssessment.trim(),
            strengths: reviewContent.strengths.trim(),
            areasForImprovement: reviewContent.areasForImprovement.trim(),
            recommendedDrills: reviewContent.recommendedDrills.trim(),
            keyTimestamps: reviewContent.keyTimestamps.trim() || null,
            supplementalDocUrl: reviewContent.supplementalDocUrl.trim() || null,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload review");
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-700 font-medium">Review submitted successfully!</p>
        </div>
        <p className="text-xs text-green-600 mt-1">The athlete has been notified. Refreshing...</p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-green-600 text-white font-medium py-2.5 px-4 rounded-lg
                   hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                   transition-all duration-200 flex items-center justify-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Write Review
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-900">Film Review Submission</h4>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Overall Assessment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Overall Assessment <span className="text-red-500">*</span>
          <span className={`ml-2 text-xs ${getCharCount('overallAssessment') >= 200 ? 'text-green-600' : 'text-gray-400'}`}>
            ({getCharCount('overallAssessment')}/200 min)
          </span>
        </label>
        <textarea
          value={reviewContent.overallAssessment}
          onChange={(e) => handleChange('overallAssessment', e.target.value)}
          placeholder="Provide a comprehensive overview of the athlete's performance. What did you observe overall? How would you summarize their current skill level?"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                     placeholder:text-gray-400"
        />
      </div>

      {/* Strengths */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Strengths Observed <span className="text-red-500">*</span>
          <span className={`ml-2 text-xs ${getCharCount('strengths') >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
            ({getCharCount('strengths')}/100 min)
          </span>
        </label>
        <textarea
          value={reviewContent.strengths}
          onChange={(e) => handleChange('strengths', e.target.value)}
          placeholder="What does this athlete do well? Highlight specific techniques, decisions, or physical attributes that stood out positively."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                     placeholder:text-gray-400"
        />
      </div>

      {/* Areas for Improvement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Areas for Improvement <span className="text-red-500">*</span>
          <span className={`ml-2 text-xs ${getCharCount('areasForImprovement') >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
            ({getCharCount('areasForImprovement')}/100 min)
          </span>
        </label>
        <textarea
          value={reviewContent.areasForImprovement}
          onChange={(e) => handleChange('areasForImprovement', e.target.value)}
          placeholder="What specific areas need work? Be constructive and specific about what the athlete should focus on improving."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                     placeholder:text-gray-400"
        />
      </div>

      {/* Recommended Drills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recommended Drills/Exercises <span className="text-red-500">*</span>
          <span className={`ml-2 text-xs ${getCharCount('recommendedDrills') >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
            ({getCharCount('recommendedDrills')}/100 min)
          </span>
        </label>
        <textarea
          value={reviewContent.recommendedDrills}
          onChange={(e) => handleChange('recommendedDrills', e.target.value)}
          placeholder="What specific drills or exercises should the athlete practice? How often should they do them? Any particular focus areas for each drill?"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                     placeholder:text-gray-400"
        />
      </div>

      {/* Key Timestamps (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Key Video Timestamps <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <textarea
          value={reviewContent.keyTimestamps}
          onChange={(e) => handleChange('keyTimestamps', e.target.value)}
          placeholder={"Example:\n0:45 - Great footwork on this play\n2:15 - Notice the hand placement here\n5:30 - This is the technique to improve"}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                     placeholder:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-500">
          Reference specific moments in the video with timestamps
        </p>
      </div>

      {/* Supplemental Document (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supplemental Document Link <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
          type="url"
          value={reviewContent.supplementalDocUrl}
          onChange={(e) => handleChange('supplementalDocUrl', e.target.value)}
          placeholder="https://docs.google.com/... or video link"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent
                     placeholder:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-500">
          Add a link to additional materials (diagrams, video breakdown, detailed document)
        </p>
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 px-4 rounded-lg
                     hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
                     transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !isValid()}
          className="flex-1 bg-green-600 text-white font-medium py-2.5 px-4 rounded-lg
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
      </div>
    </form>
  );
}
