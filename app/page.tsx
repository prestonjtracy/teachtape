import Link from "next/link";
import Image from "next/image";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-blue-700 text-white py-20 px-6">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Hero Logo */}
          <div className="mb-8">
            <Image
              src="/teachtape-logo-full.png"
              alt="TeachTape"
              width={400}
              height={120}
              priority
              className="h-20 w-auto mx-auto"
            />
          </div>
          
          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            Master Your Sport with
            <br />
            Expert Coaching
          </h1>
          
          {/* Hero Subtext */}
          <p className="text-lg sm:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect with verified coaches for personalized 1:1 lessons and detailed film breakdowns. 
            Take your game to the next level.
          </p>
          
          {/* Hero Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
            <Link 
              href="/coaches"
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg border-2 border-white/30 transition-all duration-200 hover:bg-white/20"
            >
              Browse Coaches
            </Link>
            <Link 
              href="/auth/signup"
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg transition-all duration-200 hover:bg-gray-50"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 text-sm font-medium uppercase tracking-wider mb-8">
            Trusted by athletes worldwide
          </p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="h-12 w-24 bg-gray-300 rounded flex items-center justify-center text-sm font-medium">
              Logo 1
            </div>
            <div className="h-12 w-24 bg-gray-300 rounded flex items-center justify-center text-sm font-medium">
              Logo 2
            </div>
            <div className="h-12 w-24 bg-gray-300 rounded flex items-center justify-center text-sm font-medium">
              Logo 3
            </div>
            <div className="h-12 w-24 bg-gray-300 rounded flex items-center justify-center text-sm font-medium">
              Logo 4
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose TeachTape?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform connects you with the best coaches and provides the tools you need to excel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Verified Coaches</h3>
              <p className="text-gray-600">
                All our coaches are thoroughly vetted professionals with proven track records and certifications.
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Film Breakdowns</h3>
              <p className="text-gray-600">
                Get detailed video analysis of your performance with personalized feedback and improvement tips.
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Flexible Scheduling</h3>
              <p className="text-gray-600">
                Book sessions that fit your schedule with easy online booking and instant confirmations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of athletes who have improved their skills with TeachTape coaches.
          </p>
          <Link 
            href="/coaches"
            className="inline-flex items-center justify-center px-8 py-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Find Your Coach Today
          </Link>
        </div>
      </section>
    </div>
  );
}