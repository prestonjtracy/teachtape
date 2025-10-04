'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({
    password: '',
    confirmPassword: ''
  });

  // Check if session is already active or if we need to exchange code
  useEffect(() => {
    const code = searchParams.get('code');
    const sessionActive = searchParams.get('session');
    
    // If session is already active (came from callback), no need to exchange code
    if (sessionActive === 'active') {
      console.log('Session already active, ready for password reset');
      setSessionLoading(false);
      return;
    }
    
    // Legacy flow: exchange code for session
    if (!code) {
      setError('Invalid reset link. Please request a new password reset.');
      setSessionLoading(false);
      return;
    }

    const exchangeCodeForSession = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('Code exchange error:', error);
          setError('Invalid or expired reset link. Please request a new password reset.');
        } else {
          console.log('Session created successfully');
          // Session is now active, user can set new password
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setSessionLoading(false);
      }
    };

    exchangeCodeForSession();
  }, [searchParams, supabase.auth]);

  const validateForm = () => {
    const errors = { password: '', confirmPassword: '' };
    let isValid = true;

    if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔒 [RESET PASSWORD] Form submitted');
    console.log('🔒 [RESET PASSWORD] Form data:', { 
      password: formData.password ? '[hidden]' : 'empty',
      confirmPassword: formData.confirmPassword ? '[hidden]' : 'empty',
      passwordLength: formData.password.length,
      confirmLength: formData.confirmPassword.length
    });
    
    if (!validateForm()) {
      console.log('❌ [RESET PASSWORD] Form validation failed');
      console.log('❌ [RESET PASSWORD] Form errors:', formErrors);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔒 [RESET PASSWORD] Attempting to update password...');
      
      // First check if we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('🔒 [RESET PASSWORD] Current session:', { 
        hasSession: !!sessionData.session,
        sessionError: sessionError?.message 
      });
      
      if (!sessionData.session) {
        throw new Error('No active session found. Please request a new password reset link.');
      }
      
      // Add a timeout to prevent hanging
      const updatePromise = supabase.auth.updateUser({
        password: formData.password
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Password update timed out. Please try again.')), 10000)
      );
      
      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ [RESET PASSWORD] Update failed:', error);
        throw error;
      }

      console.log('✅ [RESET PASSWORD] Password updated successfully');
      setSuccess(true);
      
      // Redirect to login after 2 seconds (better UX for password reset)
      setTimeout(() => {
        console.log('🔄 [RESET PASSWORD] Redirecting to login...');
        router.push('/auth/login?message=Password updated successfully. Please sign in with your new password.');
      }, 2000);

    } catch (err: any) {
      console.error('❌ [RESET PASSWORD] Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific error when user starts typing
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Loading state while exchanging code
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-subtle py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-neutral-text-secondary">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Error state - invalid or expired link
  if (error && !success) {
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
              Reset Link Invalid
            </h2>
            <p className="mt-2 text-neutral-text-secondary">
              {error}
            </p>
          </div>
          <div className="text-center">
            <Link 
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
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
            <div className="text-green-500 text-4xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-neutral-text">
              Password Updated
            </h2>
            <p className="mt-2 text-neutral-text-secondary">
              Your password has been successfully updated. Redirecting to dashboard...
            </p>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  // Main reset password form
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
          <h2 className="text-3xl font-bold text-neutral-text">
            Set New Password
          </h2>
          <p className="mt-2 text-neutral-text-secondary">
            Enter your new password below
          </p>
        </div>

        <div className="bg-white p-8 rounded-brand shadow-brand-md border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-text mb-1">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`appearance-none relative block w-full px-3 py-3 border ${
                  formErrors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary focus:z-10 sm:text-sm`}
                placeholder="Enter new password"
                minLength={6}
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-text mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`appearance-none relative block w-full px-3 py-3 border ${
                  formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary focus:z-10 sm:text-sm`}
                placeholder="Confirm new password"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                onClick={() => console.log('🔒 [RESET PASSWORD] Button clicked!')}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating Password...
                  </div>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-neutral-text-muted hover:text-brand-primary transition-colors">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}