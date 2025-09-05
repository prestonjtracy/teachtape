import Image from 'next/image';
import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-subtle py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/logo-full.svg"
              alt="TeachTape"
              width={200}
              height={60}
              className="mx-auto"
            />
          </Link>
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-3xl font-bold text-neutral-text">
            Authentication Error
          </h2>
          <p className="mt-2 text-neutral-text-secondary">
            The authentication link is invalid or has expired.
          </p>
        </div>
        
        <div className="text-center space-y-3">
          <p className="text-sm text-neutral-text-muted">
            This can happen if:
          </p>
          <ul className="text-sm text-neutral-text-muted text-left max-w-xs mx-auto">
            <li>• The link has already been used</li>
            <li>• The link has expired</li>
            <li>• The link was copied incorrectly</li>
          </ul>
        </div>

        <div className="text-center space-y-3">
          <Link 
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent transition-colors"
          >
            Back to Login
          </Link>
          
          <div>
            <Link href="/" className="text-sm text-neutral-text-muted hover:text-brand-primary transition-colors">
              ← Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}