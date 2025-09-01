export function formatCents(cents?: number): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}