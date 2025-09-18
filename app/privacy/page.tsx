import Link from "next/link";
import Image from "next/image";

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-bold text-neutral-text mb-8">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none space-y-6 text-neutral-text-secondary">
            <p className="text-sm text-neutral-text-muted mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">1. Information We Collect</h2>
              <p>
                At TeachTape, we collect information you provide directly to us, such as when you create an account, book coaching sessions, or contact us for support.
              </p>
              
              <h3 className="text-xl font-medium text-neutral-text">Personal Information</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Name and contact information</li>
                <li>Profile information and photos</li>
                <li>Payment information</li>
                <li>Communications between you and coaches</li>
                <li>Video content uploaded for analysis</li>
              </ul>

              <h3 className="text-xl font-medium text-neutral-text">Automatically Collected Information</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Device information and IP address</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar technologies</li>
                <li>Location data (if permitted)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Provide and improve our coaching platform</li>
                <li>Connect you with appropriate coaches</li>
                <li>Process payments and bookings</li>
                <li>Send important updates and notifications</li>
                <li>Ensure platform safety and security</li>
                <li>Analyze usage patterns to enhance user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">3. Information Sharing and Disclosure</h2>
              <p>
                We may share your information in the following circumstances:
              </p>
              
              <h3 className="text-xl font-medium text-neutral-text">With Coaches</h3>
              <p>
                When you book a session, we share necessary information with your chosen coach to facilitate the coaching relationship.
              </p>

              <h3 className="text-xl font-medium text-neutral-text">Service Providers</h3>
              <p>
                We work with third-party service providers who assist us in operating our platform, processing payments, and providing customer support.
              </p>

              <h3 className="text-xl font-medium text-neutral-text">Legal Requirements</h3>
              <p>
                We may disclose information when required by law or to protect the rights, property, and safety of TeachTape, our users, or others.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Regular security assessments and audits</li>
                <li>Access controls and authentication measures</li>
                <li>Secure payment processing systems</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">5. Data Retention</h2>
              <p>
                We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. Specifically:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Account information: Until you delete your account</li>
                <li>Session recordings: As long as your account is active</li>
                <li>Payment records: For legal and tax requirements</li>
                <li>Support communications: For quality assurance purposes</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">6. Your Rights and Choices</h2>
              <p>
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Remember your preferences and settings</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Provide personalized content and advertisements</li>
                <li>Ensure platform security and prevent fraud</li>
              </ul>
              <p>
                You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">8. Children's Privacy</h2>
              <p>
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">9. International Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this privacy policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">10. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the "Last updated" date. Your continued use of our service after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">11. Contact Us</h2>
              <p>
                If you have any questions about this privacy policy or our privacy practices, please contact us at:
              </p>
              <div className="ml-4">
                <p>Email: team@teachtape.com</p>
                <p>Address: TeachTape Privacy Department</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">12. California Privacy Rights</h2>
              <p>
                California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to delete personal information, and the right to opt-out of the sale of personal information.
              </p>
              <p>
                Note: TeachTape does not sell personal information to third parties.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}