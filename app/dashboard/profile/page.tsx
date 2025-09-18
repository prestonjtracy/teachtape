import ProfileClient from './ProfileClient';

export default function DashboardProfilePage() {
  // Client-side only to avoid server-side auth issues - data will be fetched in client
  return <ProfileClient profile={null} coach={null} />;
}