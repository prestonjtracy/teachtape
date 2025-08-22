import supabase from "@/supabase/client";
import styles from "../styles.module.css";
// Only add this if you use a <Link> somewhere on the page
// import Link from "next/link";


interface Profile {
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface Listing {
  id: string;

  title: string | null;
  price_cents: number;
  duration_minutes: number;
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

export default async function CoachPage({
  params,
}: {
  params: { id: string };
}) {
  try {

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url")
      .eq("id", params.id)
      .single();

    if (profileError || !profile) {
      throw profileError ?? new Error("Coach not found");
    }

    const {
      data: listingsData,
      error: listingsError,
    } = await supabase
      .from("listings")
      .select("id, title, price_cents, duration_minutes")
      .eq("coach_id", params.id);

    if (listingsError) throw listingsError;

    const listings: Listing[] = listingsData ?? [];

    const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    return (
      <main className={styles.container}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name ?? "Coach"} />
            ) : (
              getInitials(profile.full_name)
            )}
          </div>
          <div className={styles.name}>{profile.full_name ?? "Unnamed"}</div>
          <div className={styles.role}>{profile.role ?? ""}</div>
        </div>

        {listings.length > 0 ? (
          <div className={styles.grid}>
            {listings.map((listing) => (
              <div key={listing.id} className={styles.card}>
                <div className={styles.name}>{listing.title ?? "Untitled"}</div>
                <div className={styles.role}>
                  {formatPrice(listing.price_cents)} · {listing.duration_minutes} min
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>No listings found.</div>
        )}
      </main>
    );
  } catch (err) {
    console.error("Error loading coach profile:", err);
    return (
      <main className={styles.container}>
        <div className={styles.emptyState}>Failed to load coach.</div>
      </main>
    );
  }