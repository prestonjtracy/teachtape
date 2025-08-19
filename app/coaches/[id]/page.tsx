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
    return (
      <main className={styles.container}>
        <div className={styles.emptyState}>Failed to load coach.</div>
      </main>
    );
  }
}