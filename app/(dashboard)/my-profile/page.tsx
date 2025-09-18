import MyProfileClient from './MyProfileClient';

export default function MyProfilePage() {
  // Client-side only to avoid server-side auth issues
  return <MyProfileClient initialUser={null} initialProfile={null} />;
}