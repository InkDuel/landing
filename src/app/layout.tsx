import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Figtree,
  Inter,
  Instrument_Serif,
  Literata,
  Outfit,
} from "next/font/google";
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

// Legacy fonts, still used by the pages that have not migrated yet.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InkDuel | Escribir mejor",
  description: "InkDuel no es una app para escribir más. Es una app para escribir mejor.",
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#12162b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fonts = [bricolage, figtree, literata, outfit, inter, instrument]
    .map((font) => font.variable)
    .join(" ");

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fonts} antialiased`}>{children}</body>
    </html>
  );
}
