import Image from 'next/image';

interface ProfileHeaderProps {
  avatar_url: string | null;
  full_name: string | null;
  role: string | null;
  bio: string | null;
  sport: string | null;
  email?: string;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileHeader({
  avatar_url,
  full_name,
  role,
  bio,
  sport,
  email
}: ProfileHeaderProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="bg-gradient-to-r from-[#123C7A] via-[#123C7A]/80 to-transparent h-24"></div>
        
        <div className="px-8 pb-8 -mt-12 relative">
          <div className="text-center">
            {/* Avatar */}
            <div className="relative inline-block">
              {avatar_url ? (
                <div className="h-40 w-40 rounded-full overflow-hidden ring-4 ring-white shadow-lg mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatar_url}
                    alt={`${full_name || "Coach"} avatar`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-40 w-40 rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#123C7A] flex items-center justify-center ring-4 ring-white shadow-lg mx-auto">
                  <span className="text-white text-4xl font-bold">
                    {getInitials(full_name)}
                  </span>
                </div>
              )}
            </div>

            {/* Name and Role */}
            <div className="mt-6 space-y-2">
              <h1 className="text-3xl font-bold text-[#123C7A]">
                {full_name || "Unnamed Coach"}
              </h1>
              
              {role && (
                <div className="inline-flex items-center rounded-full bg-[#FF5A1F]/10 px-4 py-2 text-sm font-semibold text-[#FF5A1F]">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.286.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </div>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <div className="mt-6 max-w-3xl mx-auto">
                <p className="text-lg text-gray-600 leading-relaxed">
                  {bio}
                </p>
              </div>
            )}

            {/* Sport Chips */}
            {sport && (
              <div className="mt-6">
                <div className="inline-flex items-center rounded-full bg-[#F5F7FB] px-4 py-2 text-sm font-medium text-[#123C7A]">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {sport}
                </div>
              </div>
            )}

            {/* Optional: Coach Stats or Additional Info */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified Coach
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Quick Response
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}