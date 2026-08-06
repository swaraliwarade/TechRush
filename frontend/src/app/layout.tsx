import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";

// Removed next/font/google to avoid external font fetching in production builds.
// Using system sans-serif stack; you can add local fonts in globals.css if desired.


export const metadata: Metadata = {
  title: "TrustPass Bank — Secure Passwordless Banking",
  description: "Register your TrustPass account and access retail or commercial banking portals with passkey security.",
};

import { AuthProvider } from "@/app/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"

    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
