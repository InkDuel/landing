import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Literata } from "next/font/google";
import { DEFAULT_LOCALE } from "@/lib/i18n";

import "./globals.css";

// 2026 system (04 - Tipografía): Bricolage for the brand voice, Figtree for
// the interface, Literata for everything people write.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

// The site's fallback language is English (DEFAULT_LOCALE), like the app:
// static pages render it first and switch on the client. Each page
// container declares its real language with lang={locale}.
export const metadata: Metadata = {
  title: "InkDuel | Write better",
  description: "InkDuel isn't an app for writing more. It's an app for writing better.",
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
};

export const viewport: Viewport = {
  // Light only: background.primary.
  themeColor: "#f6f7fb",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fonts = [bricolage, figtree, literata]
    .map((font) => font.variable)
    .join(" ");

  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <body className={`${fonts} antialiased`}>{children}</body>
    </html>
  );
}
