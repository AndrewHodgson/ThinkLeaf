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
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var storedTheme = window.localStorage.getItem("thinkleaf.theme.v1");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var isDark = storedTheme ? storedTheme === "dark" : prefersDark;
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
} catch {}
            `.trim(),
          }}
        />
        {children}
      </body>
    </html>
  );
}
