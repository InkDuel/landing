import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Literata } from "next/font/google";
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
  const fonts = [bricolage, figtree, literata]
    .map((font) => font.variable)
    .join(" ");

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fonts} antialiased`}>{children}</body>
    </html>
  );
}
