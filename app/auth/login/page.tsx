"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push(next);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, next, supabase]);

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
            Welcome back
          </h2>
          <p className="mt-2 text-neutral-text-secondary">
            Sign in to your TeachTape account
          </p>
        </div>
        <div className="bg-white p-8 rounded-brand shadow-brand-md border border-gray-100">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#F45A14',
                    brandAccent: '#FF8A4C',
                    brandButtonText: 'white',
                    defaultButtonBackground: '#F8FAFC',
                    defaultButtonBackgroundHover: '#F1F5F9',
                    inputBackground: 'white',
                    inputBorder: '#E5E7EB',
                    inputBorderHover: '#D1D5DB',
                    inputBorderFocus: '#F45A14',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '10px',
                    buttonBorderRadius: '10px',
                    inputBorderRadius: '10px',
                  },
                }
              }
            }}
            providers={[]}
            redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:3000/auth/callback'}
            onlyThirdPartyProviders={false}
            magicLink={true}
            view="sign_in"
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-neutral-text-muted">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="font-medium text-brand-primary hover:text-brand-accent transition-colors">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
