import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Jilem Modas CRM",
  description: "CRM para gestão de clientes da Jilem Modas",
  icons: {
    icon: "/jilem-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="w-full" lang="pt-BR">
      <head>
        <link rel="icon" href="/jilem-logo.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-full overflow-x-hidden`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
