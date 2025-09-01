import "./globals.css";
import type { Metadata } from "next";
import Header from "./_components/Header";
import TestModeBanner from "@/components/TestModeBanner";

export const metadata: Metadata = {
  title: "TeachTape",
  description: "Book 1:1 lessons and film breakdowns with verified coaches.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Check for test mode on the server side
  const isTestMode = process.env.STRIPE_TEST_MODE === 'true' || process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true';
  
  return (
    <html lang="en">
      <body>
        <TestModeBanner isTestMode={isTestMode} />
        <div style={{ 
          marginTop: isTestMode ? '44px' : '0',
          minHeight: '100vh'
        }}>
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
