import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.votria.fr";

export const metadata: Metadata = {
  title: {
    default: "VotrIA — Votre premier employe IA",
    template: "%s | VotrIA",
  },
  description:
    "Plateforme SaaS d'agents IA autonomes pour les PME francaises. Emails, commercial, admin, support, direction — sans informatique.",
  metadataBase: new URL(APP_URL),
  icons: { icon: "/favicon.svg" },
  keywords: [
    "IA",
    "agents IA",
    "automatisation",
    "PME",
    "SaaS",
    "email",
    "commercial",
    "support client",
    "intelligence artificielle",
    "France",
  ],
  authors: [{ name: "AI2 / DATAKOO" }],
  creator: "VotrIA",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: APP_URL,
    siteName: "VotrIA",
    title: "VotrIA — Votre premier employe IA",
    description:
      "Deployez des agents IA autonomes qui traitent vos emails, qualifient vos prospects et gerent votre admin.",
    images: [
      {
        url: `${APP_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: "VotrIA — Agents IA pour PME",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VotrIA — Votre premier employe IA",
    description:
      "Agents IA autonomes pour les PME francaises. Emails, commercial, admin, support — sans code.",
    images: [`${APP_URL}/og-image.svg`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
