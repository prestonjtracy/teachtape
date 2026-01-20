import Link from 'next/link';

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Animation Container */}
        <div className="text-center mb-8">
          {/* Animated Success Circle */}
          <div className="relative inline-block">
            {/* Outer pulse rings */}
            <div className="absolute inset-0 w-32 h-32 bg-green-400/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute inset-2 w-28 h-28 bg-green-400/30 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>

            {/* Main success icon */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Headline */}
          <h1 className="mt-8 text-3xl sm:text-4xl font-bold text-gray-900">
            You're All Set!
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-md mx-auto">
            Your coaching session has been successfully booked and confirmed.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold">Booking Confirmed</p>
                  <p className="text-white/70 text-sm">Check your email for details</p>
                </div>
              </div>
              <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#F45A14]/10 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              What happens next
            </h2>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Confirmation Email Sent</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    A detailed confirmation email with your session details has been sent to your inbox.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#123C7A]/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Coach Notified</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Your coach has been notified and will receive all the booking details.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Meeting Details Coming</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    You'll receive the video call link or meeting location before your session.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#F45A14]/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Stay Connected</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Use the messaging feature to communicate with your coach and ask any questions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100"></div>

          {/* Action Buttons */}
          <div className="p-6 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/athlete-dashboard"
                className="flex-1 inline-flex items-center justify-center px-6 py-3.5 bg-[#F45A14] hover:bg-[#E04D0B] text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View My Sessions
              </Link>
              <Link
                href="/coaches"
                className="flex-1 inline-flex items-center justify-center px-6 py-3.5 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors border-2 border-gray-200 hover:border-gray-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse More Coaches
              </Link>
            </div>
          </div>
        </div>

        {/* Pro Tip Card */}
        <div className="mt-6 bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Pro Tip: Prepare for Success</h3>
              <p className="text-white/80 text-sm">
                For the best coaching experience, come prepared with specific questions or areas you'd like to focus on. If you're submitting film for review, ensure the video quality is clear and captures the key moments you want feedback on.
              </p>
            </div>
          </div>
        </div>

        {/* Need Help Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Have questions about your booking?{' '}
            <Link href="/messages" className="text-[#F45A14] hover:text-[#E04D0B] font-medium">
              Message your coach
            </Link>
            {' '}or{' '}
            <Link href="/support" className="text-[#F45A14] hover:text-[#E04D0B] font-medium">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
