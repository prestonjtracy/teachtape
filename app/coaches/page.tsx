import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CoachCardSkeleton } from "@/components/ui/Loading";

interface Profile {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  sport: string | null;
  bio: string | null;
  listings: {
    id: string;
    title: string;
    price_cents: number;
  }[];
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
}
export default async function CoachesPage() {
  try {
    const supabase = createClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id, full_name, role, avatar_url, sport, bio,
        listings:listings(id, title, price_cents, is_active)
      `)
      .eq("role", "coach")
      .eq("listings.is_active", true);

    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      return (
        <div className="min-h-screen bg-background-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-neutral-text mb-2">Find Your Coach</h1>
              <p className="text-xl text-neutral-text-secondary">
                Connect with expert coaches for personalized training
              </p>
            </div>
            <EmptyState
              icon={
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="No coaches found"
              description="Be the first to join as a coach or check back later for available coaches."
              action={
                <Button asChild>
                  <Link href="/auth/signup">Join as a Coach</Link>
                </Button>
              }
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-neutral-text mb-2">Find Your Coach</h1>
            <p className="text-xl text-neutral-text-secondary mb-8">
              Connect with expert coaches for personalized training
            </p>
            
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white rounded-brand p-6 shadow-brand-sm">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search coaches by name or sport..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-brand focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <Button variant="primary">Search</Button>
            </div>
          </div>

          {/* Coaches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile: Profile) => (
              <Card key={profile.id} className="hover:shadow-brand-md transition-shadow group">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name ?? "Coach"}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        getInitials(profile.full_name)
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-text">
                        {profile.full_name ?? "Unnamed Coach"}
                      </h3>
                      {profile.sport && (
                        <Badge variant="default" className="mt-1">
                          {profile.sport}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="space-y-4">
                  {profile.bio && (
                    <p className="text-neutral-text-secondary text-sm line-clamp-2">
                      {profile.bio}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-neutral-text-muted">
                      {profile.listings?.length || 0} active listing{profile.listings?.length !== 1 ? 's' : ''}
                    </div>
                    {profile.listings && profile.listings.length > 0 && (
                      <div className="text-lg font-semibold text-brand-primary">
                        From ${Math.min(...profile.listings.map(l => l.price_cents)) / 100}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary"
                    asChild
                  >
                    <Link href={`/coaches/${profile.id}`}>
                      View Profile
                    </Link>
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Show more coaches CTA */}
          {profiles.length >= 6 && (
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg">
                Load More Coaches
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  } catch (err) {
    console.error("Error loading coaches:", err);
    return (
      <div className="min-h-screen bg-background-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-neutral-text mb-2">Find Your Coach</h1>
          </div>
          <EmptyState
            icon={
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Failed to load coaches"
            description="Something went wrong. Please try refreshing the page."
            action={
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            }
          />
        </div>
      </div>
    );
  }
}