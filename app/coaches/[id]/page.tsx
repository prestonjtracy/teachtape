import supabase from "@/supabase/client";
import styles from "../styles.module.css";

interface Profile {
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

export default async function CoachPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading coach profile:", error);
      return (
        <main className={styles.container}>
          <div className={styles.emptyState}>Failed to load coach.</div>
        </main>
      );
    }

    if (!profile) {
      return (
        <main className={styles.container}>
          <div className={styles.emptyState}>Coach not found.</div>
        </main>
      );
    }

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
        <section>
          <h2>Listings</h2>
          <div className={styles.emptyState}>No listings yet.</div>
        </section>
      </main>
    );
  } catch (err) {
    console.error("Unexpected error loading coach profile:", err);
    return (
      <main className={styles.container}>
        <div className={styles.emptyState}>Failed to load coach.</div>
      </main>
    );
  }
}

