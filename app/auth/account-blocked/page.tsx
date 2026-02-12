'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function AccountBlockedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const isDisabled = reason === 'disabled';
  const isDeleted = reason === 'deleted';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-subtle py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/teachtape-logo-full.png"
              alt="TeachTape"
              width={400}
              height={120}
              className="mx-auto h-24 w-auto"
            />
          </Link>
        </div>

        <div className="bg-white p-8 rounded-brand shadow-brand-md border border-gray-100">
          {isDisabled && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-neutral-text mb-2">
                  Account Suspended
                </h2>
                <p className="text-neutral-text-secondary">
                  Your account has been temporarily suspended. If you believe this is an error, please contact our support team for assistance.
                </p>
              </div>

              <a
                href="mailto:support@teachtape.com"
                className="block w-full text-center px-4 py-3 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-accent transition-colors"
              >
                Contact Support
              </a>
            </>
          )}

          {isDeleted && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-neutral-text mb-2">
                  Account Deleted
                </h2>
                <p className="text-neutral-text-secondary">
                  This account has been deleted and is no longer accessible. You can create a new account if you'd like to use TeachTape again.
                </p>
              </div>

              <Link
                href="/auth/signup"
                className="block w-full text-center px-4 py-3 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-accent transition-colors"
              >
                Create New Account
              </Link>
            </>
          )}

          {!isDisabled && !isDeleted && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-neutral-text mb-2">
                  Account Unavailable
                </h2>
                <p className="text-neutral-text-secondary">
                  Your account is currently unavailable. Please try again later or contact support if this issue persists.
                </p>
              </div>

              <a
                href="mailto:support@teachtape.com"
                className="block w-full text-center px-4 py-3 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-accent transition-colors"
              >
                Contact Support
              </a>
            </>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm font-medium text-brand-primary hover:text-brand-accent transition-colors"
          >
            Return to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AccountBlockedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    }>
      <AccountBlockedContent />
    </Suspense>
  );
}
