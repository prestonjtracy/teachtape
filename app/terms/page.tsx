import Link from "next/link";
import Image from "next/image";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background-subtle">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/teachtape-logo-full.png"
                alt="TeachTape"
                width={150}
                height={45}
                className="h-8 w-auto"
              />
            </Link>
            <Link 
              href="/"
              className="text-neutral-text hover:text-ttOrange transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-neutral-text mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none space-y-6 text-neutral-text-secondary">
            <p className="text-sm text-neutral-text-muted mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">1. Acceptance of Terms</h2>
              <p>
                By accessing and using TeachTape ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. These Terms of Service ("Terms") govern your use of our platform, which connects athletes with coaches for personalized training and video analysis.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">2. Description of Service</h2>
              <p>
                TeachTape provides a platform where athletes can connect with verified coaches for:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>One-on-one coaching sessions</li>
                <li>Video analysis and feedback</li>
                <li>Personalized training programs</li>
                <li>Skill development guidance</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">3. User Accounts</h2>
              <p>
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your password</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">4. Coach Verification</h2>
              <p>
                All coaches on our platform undergo a verification process. However, TeachTape does not guarantee the qualifications, performance, or conduct of any coach. Users are encouraged to review coach profiles, ratings, and reviews before booking sessions.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">5. Payment Terms</h2>
              <p>
                Payment for coaching services is processed through our secure payment system. By making a payment, you agree to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Pay all charges associated with your bookings</li>
                <li>Provide accurate billing information</li>
                <li>Accept our refund and cancellation policies</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">6. User Conduct</h2>
              <p>
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Upload inappropriate or offensive content</li>
                <li>Attempt to gain unauthorized access to the platform</li>
                <li>Use the Service for commercial purposes without permission</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">7. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are owned by TeachTape and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">8. Privacy</h2>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">9. Limitation of Liability</h2>
              <p>
                In no event shall TeachTape, its officers, directors, employees, or agents, be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">10. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through the Service. Continued use after such modifications constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">12. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="ml-4">
                <p>Email: team@teachtape.com</p>
                <p>Address: TeachTape Legal Department</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}