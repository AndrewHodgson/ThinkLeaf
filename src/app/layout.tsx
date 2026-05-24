import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thinkleaf",
  description: "Notes with room to think.",
  icons: {
    icon: "/brand/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
