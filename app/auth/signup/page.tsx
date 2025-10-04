"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import Image from "next/image";
import Link from "next/link";


function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const supabase = createClient();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    accountType: 'athlete'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            account_type: formData.accountType
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Check if email confirmation is required
        if (!authData.session) {
          // Email confirmation required - show success message instead of error
          setError('Account created! Please check your email and click the confirmation link to complete registration. Once confirmed, you can sign in.');
          return;
        }

        // Create profile immediately after signup
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            auth_user_id: authData.user.id,
            full_name: formData.fullName,
            role: formData.accountType,
            email: formData.email
          });

        if (profileError) {
          console.warn('Profile creation error (will retry):', profileError);
          // Don't throw here - profile can be created later via callback
        }

        // Redirect based on account type
        const redirectUrl = formData.accountType === 'coach' ? '/dashboard' : '/coaches';
        router.push(`${redirectUrl}?signup=success`);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-subtle py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/teachtape-logo-full.png"
              alt="TeachTape"
              width={200}
              height={60}
              className="mx-auto"
            />
          </Link>
          <h2 className="text-3xl font-bold text-neutral-text">
            Join TeachTape
          </h2>
          <p className="mt-2 text-neutral-text-secondary">
            Create your account and start your journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-brand shadow-brand-md border border-gray-100 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-brand">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Account Type Selection */}
          <div>
            <label htmlFor="accountType" className="block text-sm font-medium text-neutral-text mb-2">
              Account Type *
            </label>
            <Select
              id="accountType"
              value={formData.accountType}
              onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
              required
            >
              <option value="athlete">🏃‍♂️ Athlete - Learn from expert coaches</option>
              <option value="coach">👨‍🏫 Coach - Share your expertise</option>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Choose your primary role - only admins can change this later
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-neutral-text mb-2">
              Full Name *
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-text mb-2">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-text mb-2">
              Password *
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Create a password (min. 6 characters)"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-neutral-text-muted">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-brand-primary hover:text-brand-accent transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}