import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  // Client-side only to avoid server-side auth issues - data will be fetched in client
  return <DashboardClient />;
}