import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TeachTape",
  description: "Book 1:1 lessons and film breakdowns with verified coaches."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
