import Link from 'next/link';

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Booking Confirmed! 🎾
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your coaching session has been successfully booked and paid for.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">What happens next?</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-5 h-5 text-green-500 mr-3">✓</span>
              You'll receive a confirmation email with all the session details
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-5 h-5 text-green-500 mr-3">✓</span>
              Your coach will be notified about the new booking
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-5 h-5 text-green-500 mr-3">✓</span>
              Meeting details will be shared before your session
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-5 h-5 text-green-500 mr-3">✓</span>
              Check your email for any updates from your coach
            </li>
          </ul>
        </div>

        <div className="flex space-x-4">
          <Link
            href="/coaches"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors duration-200"
          >
            Browse More Coaches
          </Link>
          <Link
            href="/athlete-dashboard"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-md text-center transition-colors duration-200"
          >
            View My Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}