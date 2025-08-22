import { supabase } from "@/supabase/client";
import Link from "next/link";
import styles from "./styles.module.css";

interface Profile {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
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
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .eq("role", "coach");

    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      return (
        <main className={styles.container}>
          <h1>Coaches</h1>
          <div className={styles.emptyState}>No coaches found.</div>
        </main>
      );
    }

    return (
      <main className={styles.container}>
        <h1>Coaches</h1>
        <div className={styles.grid}>
          {profiles.map((profile: Profile) => (
            <Link
              key={profile.id}
              href={`/coaches/${profile.id}`}
              className={styles.card}
            >
              <div className={styles.avatar}>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Coach"}
                  />
                ) : (
                  getInitials(profile.full_name)
                )}
              </div>
              <div className={styles.name}>
                {profile.full_name ?? "Unnamed"}
              </div>
              <div className={styles.role}>{profile.role ?? "unknown"}</div>
            </Link>
          ))}
        </div>
      </main>
    );
  } catch (err) {
    console.error("Error loading coaches:", err);
    return (
      <main className={styles.container}>
        <h1>Coaches</h1>
        <div className={styles.emptyState}>Failed to load coaches.</div>
      </main>
    );
  }
}
