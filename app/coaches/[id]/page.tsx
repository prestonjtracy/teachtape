import { getCoachById } from "@/lib/db/coaches";
import styles from "../styles.module.css";
import { notFound } from "next/navigation";
import CoachPageClient from "./CoachPageClient";

export const dynamic = "force-dynamic";

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
  console.log(`🎯 [CoachPage] Rendering page for coach ID: ${params.id}`);
  
  const result = await getCoachById(params.id);
  
  if (!result.success) {
    console.error(`❌ [CoachPage] Failed to load coach:`, result.error);
    
    // Return 404 for invalid UUIDs or not found coaches
    if (result.error.includes("Invalid") || result.error.includes("not found")) {
      notFound();
    }
    
    // For other errors, show error state
    return (
      <main className={styles.container}>
        <div className={styles.emptyState}>
          Failed to load coach: {result.error}
        </div>
      </main>
    );
  }

  const { data: coach } = result;
  console.log(`✅ [CoachPage] Successfully loaded coach: ${coach.full_name}`);

  // Pass data to client component for interactivity
  return <CoachPageClient coach={coach} coachId={params.id} />;
}