'use client';

interface ReviewContent {
  overallAssessment: string;
  strengths: string;
  areasForImprovement: string;
  recommendedDrills: string;
  keyTimestamps?: string | null;
  supplementalDocUrl?: string | null;
}

interface FilmReviewDisplayProps {
  reviewContent: ReviewContent | null;
  coachName: string;
  completedAt?: string;
  supplementalDocUrl?: string | null;
}

export default function FilmReviewDisplay({
  reviewContent,
  coachName,
  completedAt,
  supplementalDocUrl
}: FilmReviewDisplayProps) {
  // If no structured content, show a simple message with link to supplemental doc
  if (!reviewContent) {
    if (supplementalDocUrl) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Review Completed by {coachName}</h3>
              {completedAt && (
                <p className="text-sm text-gray-500">
                  {new Date(completedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
          <a
            href={supplementalDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-[#FF5A1F] text-white font-medium rounded-lg hover:bg-[#E44F1B] transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Review Document
          </a>
        </div>
      );
    }
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">No review content available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#123C7A] to-[#1e5bb8] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Film Review by {coachName}</h3>
              {completedAt && (
                <p className="text-sm text-white/80">
                  {new Date(completedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            Completed
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="p-6 space-y-6">
        {/* Overall Assessment */}
        <section>
          <h4 className="flex items-center text-lg font-semibold text-[#123C7A] mb-3">
            <svg className="w-5 h-5 mr-2 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Overall Assessment
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">{reviewContent.overallAssessment}</p>
          </div>
        </section>

        {/* Strengths */}
        <section>
          <h4 className="flex items-center text-lg font-semibold text-[#123C7A] mb-3">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Strengths Observed
          </h4>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <p className="text-gray-700 whitespace-pre-wrap">{reviewContent.strengths}</p>
          </div>
        </section>

        {/* Areas for Improvement */}
        <section>
          <h4 className="flex items-center text-lg font-semibold text-[#123C7A] mb-3">
            <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Areas for Improvement
          </h4>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <p className="text-gray-700 whitespace-pre-wrap">{reviewContent.areasForImprovement}</p>
          </div>
        </section>

        {/* Recommended Drills */}
        <section>
          <h4 className="flex items-center text-lg font-semibold text-[#123C7A] mb-3">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Recommended Drills & Exercises
          </h4>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-gray-700 whitespace-pre-wrap">{reviewContent.recommendedDrills}</p>
          </div>
        </section>

        {/* Key Timestamps (if provided) */}
        {reviewContent.keyTimestamps && (
          <section>
            <h4 className="flex items-center text-lg font-semibold text-[#123C7A] mb-3">
              <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Key Video Timestamps
            </h4>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <p className="text-gray-700 whitespace-pre-wrap font-mono text-sm">{reviewContent.keyTimestamps}</p>
            </div>
          </section>
        )}

        {/* Supplemental Document Link (if provided) */}
        {(reviewContent.supplementalDocUrl || supplementalDocUrl) && (
          <section className="pt-4 border-t border-gray-200">
            <h4 className="flex items-center text-lg font-semibold text-[#123C7A] mb-3">
              <svg className="w-5 h-5 mr-2 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Additional Resources
            </h4>
            <a
              href={reviewContent.supplementalDocUrl || supplementalDocUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-[#FF5A1F] text-white font-medium rounded-lg hover:bg-[#E44F1B] transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Supplemental Document
            </a>
          </section>
        )}
      </div>
    </div>
  );
}
