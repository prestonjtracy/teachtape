'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Fetch profile data including avatar_url
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, role')
              .eq('id', user.id)
              .single();
            setProfile(profileData);
          } catch (profileError) {
            // Profile fetch failed, use fallback
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ [Header] Error fetching user:', error);
        setLoading(false);
      }
    }

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(timeout);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile data including avatar_url
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, role')
              .eq('id', session.user.id)
              .single();
            setProfile(profileData);
          } catch (profileError) {
            // Profile fetch failed in auth change, use fallback
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setShowUserMenu(false);
  }

  return (
    <header className="relative z-50 bg-white border-b border-gray-200">
      <div className="w-full px-6 md:px-8">
        <div className="flex items-center justify-between h-16 w-full">
          {/* Logo - Left Side */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/teachtape-logo-full.png"
                alt="TeachTape"
                width={200}
                height={60}
                priority
                className="h-10 w-auto hover:scale-105 transition-transform duration-200"
              />
            </Link>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-ttBlue font-semibold text-lg px-4 py-2 transition-all duration-200 hover:scale-105 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-ttOrange after:transition-all after:duration-200 hover:after:w-full"
            >
              Home
            </Link>
            <Link 
              href="/coaches" 
              className="text-gray-700 hover:text-ttBlue font-semibold text-lg px-4 py-2 transition-all duration-200 hover:scale-105 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-ttOrange after:transition-all after:duration-200 hover:after:w-full"
            >
              Coaches
            </Link>
            {user && (
              <Link 
                href="/dashboard" 
                className="text-gray-700 hover:text-ttBlue font-semibold text-lg px-4 py-2 transition-all duration-200 hover:scale-105 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-ttOrange after:transition-all after:duration-200 hover:after:w-full"
              >
                Dashboard
              </Link>
            )}
            {user && profile?.role === 'admin' && (
              <Link 
                href="/admin" 
                className="text-gray-700 hover:text-ttBlue font-semibold text-lg px-4 py-2 transition-all duration-200 hover:scale-105 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-red-500 after:transition-all after:duration-200 hover:after:w-full"
              >
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Desktop Auth Controls - Right Side */}
          <div className="hidden md:flex items-center space-x-3">
            {loading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent"></div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-brand hover:bg-background-subtle transition-colors"
                >
                  {profile?.avatar_url ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-white/50">
                      <Image
                        src={profile.avatar_url}
                        alt={`${profile.full_name || user.email} avatar`}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                        unoptimized={true}
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 bg-brand-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {(profile?.full_name || user.email || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-neutral-text">
                    {profile?.full_name || user.email}
                  </span>
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
                      {profile?.role === 'admin' && (
                        <>
                          <hr className="my-1 border-gray-200" />
                          <Link
                            href="/admin"
                            className="block px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            🔧 Admin Panel
                          </Link>
                        </>
                      )}
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
                <Link 
                  href="/auth/login"
                  className="px-6 py-2.5 text-gray-700 hover:text-ttBlue font-semibold text-[15px] transition-all duration-200 hover:bg-gray-50 rounded-full"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup"
                  className="px-6 py-2.5 bg-ttOrange text-white font-semibold text-[15px] rounded-full transition-all duration-200 hover:bg-ttOrange/90 hover:shadow-lg hover:scale-105 shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button - Right Side */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2.5 rounded-full text-gray-700 hover:bg-gray-100 hover:text-ttBlue transition-all duration-200"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md">
            <div className="py-6 space-y-1">
              <Link 
                href="/" 
                className="block px-6 py-3 text-gray-700 hover:text-ttBlue hover:bg-gray-50 font-semibold transition-all duration-200 rounded-lg mx-3"
                onClick={() => setShowMobileMenu(false)}
              >
                Home
              </Link>
              <Link 
                href="/coaches" 
                className="block px-6 py-3 text-gray-700 hover:text-ttBlue hover:bg-gray-50 font-semibold transition-all duration-200 rounded-lg mx-3"
                onClick={() => setShowMobileMenu(false)}
              >
                Coaches
              </Link>
              {user && (
                <>
                  <Link 
                    href="/dashboard" 
                    className="block px-6 py-3 text-gray-700 hover:text-ttBlue hover:bg-gray-50 font-semibold transition-all duration-200 rounded-lg mx-3"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/my-profile" 
                    className="block px-6 py-3 text-gray-700 hover:text-ttBlue hover:bg-gray-50 font-semibold transition-all duration-200 rounded-lg mx-3"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    My Profile
                  </Link>
                  <Link 
                    href="/my-listings" 
                    className="block px-6 py-3 text-gray-700 hover:text-ttBlue hover:bg-gray-50 font-semibold transition-all duration-200 rounded-lg mx-3"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    My Listings
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link 
                      href="/admin" 
                      className="block px-6 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold transition-all duration-200 rounded-lg mx-3"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      🔧 Admin Panel
                    </Link>
                  )}
                  <div className="border-t border-gray-100 mt-4 pt-4">
                    <button
                      onClick={() => {
                        signOut();
                        setShowMobileMenu(false);
                      }}
                      className="block w-full text-left px-6 py-3 text-red-600 hover:bg-red-50 font-semibold transition-all duration-200 rounded-lg mx-3"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
              {!user && (
                <div className="border-t border-gray-100 mt-4 pt-6 px-6 space-y-3">
                  <Link 
                    href="/auth/login" 
                    className="block px-6 py-3 text-center text-gray-700 hover:text-ttBlue hover:bg-gray-50 font-semibold transition-all duration-200 rounded-lg"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/signup" 
                    className="block px-6 py-3 text-center bg-ttOrange text-white font-semibold rounded-lg transition-all duration-200 hover:bg-ttOrange/90 shadow-md"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}