import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Polyspies",
    template: "%s | Polyspies",
  },
  description: "Track top Polymarket traders and breaking markets.",
  icons: {
    icon: "/polyspies.png",
    shortcut: "/polyspies.png",
    apple: "/polyspies.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen overflow-y-auto`}>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
