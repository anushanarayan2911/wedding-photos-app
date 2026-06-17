import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memoboard",
  description: "Sync your wedding style with your photo board",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
