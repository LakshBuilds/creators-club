import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Creators Club — Paid Instagram brand collaborations for creators",
  description:
    "Creators Club connects Indian Instagram creators with verified brands. Apply to paid campaigns, submit drafts, post sponsored Reels, and get paid via your Buyhatke wallet.",
  metadataBase: new URL("https://hatkecreators.netlify.app"),
  openGraph: {
    title: "Creators Club — Paid Instagram brand collaborations",
    description:
      "Connects Instagram creators with verified brands. Apply to live campaigns, submit drafts, get paid.",
    url: "https://hatkecreators.netlify.app",
    siteName: "Creators Club",
    type: "website"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
