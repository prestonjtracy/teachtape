import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export default function Page() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brand-primary to-brand-secondary text-white py-20 sm:py-28 px-6 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
            Master Your Sport with
            <br />
            Expert Coaching
          </h1>
          
          {/* Hero Subtext */}
          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed text-white/90">
            Connect with verified coaches for personalized 1:1 lessons and detailed film breakdowns. 
            Take your game to the next level.
          </p>
          
          {/* Hero Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <button className="w-full sm:w-auto px-6 py-3 bg-brand-secondary text-white font-semibold rounded-lg hover:bg-brand-secondary/90 transition-colors shadow-lg">
              <Link href="/coaches">Browse Coaches</Link>
            </button>
            <button className="w-full sm:w-auto px-6 py-3 bg-white text-brand-secondary font-semibold rounded-lg border border-brand-secondary hover:bg-gray-50 transition-colors shadow-lg">
              <Link href="/auth/signup">Get Started</Link>
            </button>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 px-4 bg-background-subtle">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-neutral-text-muted text-sm font-medium uppercase tracking-wider mb-8">
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
            <h2 className="text-4xl font-bold text-neutral-text mb-4">
              Why Choose TeachTape?
            </h2>
            <p className="text-xl text-neutral-text-secondary max-w-2xl mx-auto">
              Our platform connects you with the best coaches and provides the tools you need to excel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-8 hover:shadow-brand-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-text">Verified Coaches</h3>
              </CardHeader>
              <CardBody>
                <p className="text-neutral-text-secondary">
                  All our coaches are thoroughly vetted professionals with proven track records and certifications.
                </p>
              </CardBody>
            </Card>

            <Card className="text-center p-8 hover:shadow-brand-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-text">Film Breakdowns</h3>
              </CardHeader>
              <CardBody>
                <p className="text-neutral-text-secondary">
                  Get detailed video analysis of your performance with personalized feedback and improvement tips.
                </p>
              </CardBody>
            </Card>

            <Card className="text-center p-8 hover:shadow-brand-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-text">Flexible Scheduling</h3>
              </CardHeader>
              <CardBody>
                <p className="text-neutral-text-secondary">
                  Book sessions that fit your schedule with easy online booking and instant confirmations.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-brand-secondary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Join thousands of athletes who have improved their skills with TeachTape coaches.
          </p>
          <Button size="lg" className="bg-brand-primary text-white hover:bg-brand-accent shadow-lg" asChild>
            <Link href="/coaches">Find Your Coach Today</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
