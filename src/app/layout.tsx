import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { AnimEnabler } from "@/components/providers/AnimEnabler";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Job Market",
  description:
    "Employers browse ranked candidates. Candidates are ranked by skill, not CV. Every match has a price.",
  openGraph: {
    title: "The Job Market",
    description:
      "The trading floor for human talent — where the best candidate rises to the top.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg-deep text-text">
        <AnimEnabler />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
