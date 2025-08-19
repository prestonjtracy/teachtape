import supabase from "@supabase/client";
import styles from "../styles.module.css";

interface Profile {
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface Listing {
  id: string;
  title: string;
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
const { 
  data: listingsData, 
  error: listingsError 
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
          <img src={profile.avatar_url} alt={profile.full_name ?? "Coach"} />
        ) : (
          getInitials(profile.full_name)
        )}
      </div>
      <div className={styles.name}>{profile.full_name ?? "Unnamed"}</div>
      <div className={styles.role}>{profile.role ?? ""}</div>
    </div>

    <section>
      <h2>Listings</h2>
      {listings.length > 0 ? (
        <ul>
          {listings.map((listing) => (
            <li key={listing.id}>
              {listing.title} — {formatPrice(listing.price_cents)} for{" "}
              {listing.duration_minutes} minutes
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.emptyState}>No listings yet.</div>
      )}
    </section>
  </main>
);

    return (
      <main className={styles.container}>
        <div className={styles.emptyState}>Failed to load coach.</div>
      </main>
    );
  }
}
