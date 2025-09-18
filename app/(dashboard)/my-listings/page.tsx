import MyListingsClient from './MyListingsClient';

export default function MyListingsPage() {
  // Client-side only to avoid server-side auth issues - data will be fetched in client
  return <MyListingsClient />;
}