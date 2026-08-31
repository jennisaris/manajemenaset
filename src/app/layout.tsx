import type { Metadata } from "next";
import { Lexend_Deca } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const lexendDeca = Lexend_Deca({
  variable: "--font-lexend-deca",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SMART-DIKTI - Sistem Manajemen & Aset Real-Time Kemdiktisaintek",
  description: "Sistem Management & Asset Real-Time Perguruan Tinggi Kementerian Pendidikan Tinggi, Sains, dan Teknologi",
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

