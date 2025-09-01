'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setShowUserMenu(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-brand-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/teachtape-logo.png"
              alt="TeachTape"
              width={28}
              height={28}
              priority
            />
            <span className="font-semibold tracking-tight text-[17px]">TeachTape</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-neutral-text-secondary hover:text-neutral-text font-medium transition-colors"
            >
              Home
            </Link>
            <Link 
              href="/coaches" 
              className="text-neutral-text-secondary hover:text-neutral-text font-medium transition-colors"
            >
              Coaches
            </Link>
            {user && (
              <Link 
                href="/dashboard" 
                className="text-neutral-text-secondary hover:text-neutral-text font-medium transition-colors"
              >
                Dashboard
              </Link>
            )}
          </nav>

          {/* Desktop Auth Controls */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent"></div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-brand hover:bg-background-subtle transition-colors"
                >
                  <div className="h-8 w-8 bg-brand-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-neutral-text">{user.email}</span>
                  <svg className="h-4 w-4 text-neutral-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-brand shadow-brand-md border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-neutral-text hover:bg-background-subtle transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/my-profile"
                        className="block px-4 py-2 text-sm text-neutral-text hover:bg-background-subtle transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        My Profile
                      </Link>
                      <Link
                        href="/my-listings"
                        className="block px-4 py-2 text-sm text-neutral-text hover:bg-background-subtle transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        My Listings
                      </Link>
                      <hr className="my-1 border-gray-200" />
                      <button
                        onClick={signOut}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-text hover:bg-background-subtle transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-brand text-neutral-text hover:bg-background-subtle"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <Link 
              href="/" 
              className="block px-4 py-2 text-neutral-text-secondary hover:text-neutral-text font-medium"
              onClick={() => setShowMobileMenu(false)}
            >
              Home
            </Link>
            <Link 
              href="/coaches" 
              className="block px-4 py-2 text-neutral-text-secondary hover:text-neutral-text font-medium"
              onClick={() => setShowMobileMenu(false)}
            >
              Coaches
            </Link>
            {user && (
              <>
                <Link 
                  href="/dashboard" 
                  className="block px-4 py-2 text-neutral-text-secondary hover:text-neutral-text font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/my-profile" 
                  className="block px-4 py-2 text-neutral-text-secondary hover:text-neutral-text font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  My Profile
                </Link>
                <Link 
                  href="/my-listings" 
                  className="block px-4 py-2 text-neutral-text-secondary hover:text-neutral-text font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  My Listings
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setShowMobileMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-neutral-text-secondary hover:text-neutral-text font-medium"
                >
                  Sign Out
                </button>
              </>
            )}
            {!user && (
              <div className="flex flex-col space-y-2 px-4 pt-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/login" onClick={() => setShowMobileMenu(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup" onClick={() => setShowMobileMenu(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}