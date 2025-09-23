import "./globals.css";
import type { Metadata } from "next";
import Header from "./_components/Header";
import TestModeBanner from "@/components/TestModeBanner";
import { AuthProvider } from "@/lib/auth/AuthContext";

export const metadata: Metadata = {
  title: "TeachTape",
  description: "Book 1:1 lessons and film breakdowns with verified coaches.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico?v=2", sizes: "32x32", type: "image/x-icon" }
    ],
    apple: { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    shortcut: "/favicon.ico?v=2"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Check for test mode on the server side
  const isTestMode = process.env.STRIPE_TEST_MODE === 'true' || process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true';
  
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TestModeBanner isTestMode={isTestMode} />
          <div className="min-h-screen" style={{
            paddingTop: isTestMode ? '44px' : '0'
          }}>
            <Header />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
