import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bankr Agent — Live Trading Dashboard",
  description: "Autonomous AI trading bot on Base, powered by Bankr",
  openGraph: {
    title: "Bankr Agent — Live Trading Dashboard",
    description: "Autonomous AI trading bot on Base, powered by Bankr",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bankr Agent — Live Trading Dashboard",
    description: "Autonomous AI trading bot on Base, powered by Bankr",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
