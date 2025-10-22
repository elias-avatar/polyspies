import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PolyGuild - Prediction Market Analytics & Arbitrage",
  description: "Track arbitrage opportunities and top traders across Polymarket and Kalshi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen overflow-y-auto`}>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
