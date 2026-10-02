import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voice Activity Leaderboard",
  description: "Discord voice activity stats for Skype ApS",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full`}
      style={{ ["--font-xp-ui" as string]: 'Tahoma, "Segoe UI", Verdana, sans-serif' }}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
