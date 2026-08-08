import "./globals.css";
import type { Metadata, Viewport } from "next";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/nav";

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Personal cashflow, buckets, and savings.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          {user && <Nav />}
          <main className="mx-auto max-w-3xl px-4 py-6 pb-24">{children}</main>
        </div>
      </body>
    </html>
  );
}
