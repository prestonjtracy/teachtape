import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#123C7A] via-[#1E5BB5] to-[#123C7A] py-20 md:py-32 px-6 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F45A14]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#1E5BB5]/30 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Trusted by athletes nationwide
              </div>

              {/* Hero Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
                Elevate Your Game with{" "}
                <span className="text-[#F45A14]">Expert Coaching</span>
              </h1>

              {/* Hero Subtext */}
              <p className="text-lg sm:text-xl mb-8 max-w-xl leading-relaxed text-white/80">
                Connect with verified coaches for personalized 1:1 lessons and detailed film analysis. Whether you're just starting or aiming for the pros, we'll help you reach the next level.
              </p>

              {/* Hero Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link
                  href="/coaches"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[#F45A14] text-white font-semibold rounded-xl transition-all duration-200 hover:bg-[#E04D0B] shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  Find Your Coach
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border-2 border-white/30 transition-all duration-200 hover:bg-white/20 hover:border-white/50"
                >
                  Join as a Coach
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 flex flex-wrap items-center gap-8 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F45A14] to-[#E04D0B] border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{String.fromCharCode(64 + i)}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-white/80 text-sm">500+ athletes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                  <span className="text-white/80 text-sm ml-1">4.9 average rating</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Visual */}
            <div className="hidden md:block relative">
              <div className="relative w-full aspect-square max-w-md mx-auto">
                {/* Decorative rings */}
                <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                <div className="absolute inset-8 border-2 border-white/10 rounded-full"></div>
                <div className="absolute inset-16 border-2 border-white/20 rounded-full"></div>

                {/* Center content */}
                <div className="absolute inset-24 bg-gradient-to-br from-[#F45A14] to-[#E04D0B] rounded-full flex items-center justify-center shadow-2xl">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Floating badges */}
                <div className="absolute top-8 right-0 bg-white rounded-xl p-3 shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Verified</span>
                  </div>
                </div>

                <div className="absolute bottom-8 left-0 bg-white rounded-xl p-3 shadow-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#F45A14]/10 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#F45A14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">24/7 Booking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto fill-white">
            <path d="M0,96L48,90.7C96,85,192,75,288,80C384,85,480,107,576,112C672,117,768,107,864,90.7C960,75,1056,53,1152,48C1248,43,1344,53,1392,58.7L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-[#123C7A]/10 text-[#123C7A] text-sm font-semibold rounded-full mb-4">
              SIMPLE PROCESS
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How TeachTape Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes and begin your journey to athletic excellence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#F45A14] to-[#E04D0B] rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#123C7A] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Find Your Coach</h3>
                <p className="text-gray-600">
                  Browse verified coaches by sport, specialty, and availability. Read reviews and find the perfect match.
                </p>
              </div>
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#F45A14]/50 to-transparent"></div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#123C7A] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Book a Session</h3>
                <p className="text-gray-600">
                  Choose from 1:1 lessons or film analysis. Pick a time that works for you and book instantly.
                </p>
              </div>
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#123C7A]/50 to-transparent"></div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#123C7A] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Level Up</h3>
                <p className="text-gray-600">
                  Get personalized feedback, actionable insights, and watch your skills improve session after session.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-[#F45A14]/10 text-[#F45A14] text-sm font-semibold rounded-full mb-4">
              WHY TEACHTAPE
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform provides the tools and connections to accelerate your athletic development
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#F45A14]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F45A14] to-[#E04D0B] rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Coaches</h3>
              <p className="text-gray-600 leading-relaxed">
                Every coach is vetted for experience and expertise. Connect with professionals who have real playing and coaching backgrounds.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#F45A14]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Film Analysis</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload your game footage and receive detailed breakdowns. Get frame-by-frame analysis with personalized improvement tips.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#F45A14]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Flexible Scheduling</h3>
              <p className="text-gray-600 leading-relaxed">
                Book sessions that fit your schedule. Easy online booking with instant confirmations and calendar integration.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#F45A14]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Direct Messaging</h3>
              <p className="text-gray-600 leading-relaxed">
                Communicate directly with your coach. Ask questions, share updates, and build a relationship that drives results.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#F45A14]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Payments</h3>
              <p className="text-gray-600 leading-relaxed">
                Book with confidence using our secure payment system. Clear pricing, no hidden fees, and easy refund process.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#F45A14]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Reviews & Ratings</h3>
              <p className="text-gray-600 leading-relaxed">
                Make informed decisions with honest reviews from real athletes. See coach ratings and testimonials before booking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#123C7A] via-[#1E5BB5] to-[#123C7A] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#F45A14]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Take Your Game to the Next Level?
          </h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto text-white/80">
            Join thousands of athletes who have transformed their skills with personalized coaching. Your breakthrough is just one session away.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/coaches"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#F45A14] text-white font-semibold rounded-xl hover:bg-[#E04D0B] transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              Find Your Coach
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#123C7A] font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
