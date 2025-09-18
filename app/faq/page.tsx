import Link from "next/link";
import Image from "next/image";

export default function FAQ() {
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
          <h1 className="text-4xl font-bold text-neutral-text mb-8">Frequently Asked Questions</h1>
          
          <div className="space-y-8 text-neutral-text-secondary">
            <p className="text-lg text-neutral-text-muted mb-8">
              Find answers to common questions about TeachTape coaching sessions.
            </p>

            {/* Question 1 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">What happens if a coach does not show up for a meeting?</h2>
              <p>
                Please email <a href="mailto:team@teachtapesports.com" className="text-ttOrange hover:text-ttOrange/80 underline transition-colors">team@teachtapesports.com</a> immediately during or after your scheduled meeting time. You will receive a full refund.
              </p>
            </section>

            {/* Question 2 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">What happens if the athlete does not show up for the meeting?</h2>
              <p>
                Unfortunately, no refund will be issued if an athlete misses their scheduled meeting.
              </p>
            </section>

            {/* Question 3 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">What happens if a coach is late or leaves early?</h2>
              <p>
                Coaches must be present for the vast majority of the scheduled session to receive payment. If a coach arrives late or leaves early, please email <a href="mailto:team@teachtapesports.com" className="text-ttOrange hover:text-ttOrange/80 underline transition-colors">team@teachtapesports.com</a> and we will work with you to find a fair solution.
              </p>
            </section>

            {/* Question 4 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">What if technical issues prevent the meeting from running smoothly?</h2>
              <p>
                If you or your coach experience technical difficulties, please email <a href="mailto:team@teachtapesports.com" className="text-ttOrange hover:text-ttOrange/80 underline transition-colors">team@teachtapesports.com</a>. We will work with you to resolve the issue. However, if the coach is present for the majority of the scheduled time, refunds are not guaranteed.
              </p>
            </section>

            {/* Question 5 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-text">What if I have a question not listed here?</h2>
              <p>
                Please reach out anytime at <a href="mailto:team@teachtapesports.com" className="text-ttOrange hover:text-ttOrange/80 underline transition-colors">team@teachtapesports.com</a> and we'll be happy to assist.
              </p>
            </section>

            {/* Contact Section */}
            <section className="space-y-4 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-semibold text-neutral-text">Still Need Help?</h2>
              <p>
                Our support team is here to help you have the best coaching experience possible. Don't hesitate to reach out with any questions or concerns.
              </p>
              <div className="ml-4">
                <p>
                  <strong>Email:</strong> <a href="mailto:team@teachtapesports.com" className="text-ttOrange hover:text-ttOrange/80 underline transition-colors">team@teachtapesports.com</a>
                </p>
                <p className="mt-2 text-sm text-neutral-text-muted">
                  We typically respond within 24 hours during business days.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}