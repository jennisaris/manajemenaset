import type { Metadata } from "next";
import { Lexend_Deca } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const lexendDeca = Lexend_Deca({
  variable: "--font-lexend-deca",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistem Manajemen Aset Universitas - Kemdiktisaintek",
  description: "Dashboard aset universitas Kemdiktisaintek",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lexendDeca.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}

