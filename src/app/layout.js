import { Plus_Jakarta_Sans, DM_Sans, Outfit } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import Navbar from "../components/Navbar";
import ClientShell from "../components/ClientShell";
import { Analytics } from "@vercel/analytics/next"

const Footer = dynamic(() => import("../components/Footer"));
// Primary body font - Plus Jakarta Sans (clean, modern, highly legible)
const jakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

// Display font - Outfit (geometric, bold, great for headers)
// Alternative to Cabinet Grotesk from design system
const outfit = Outfit({
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cabinet",
  subsets: ["latin"],
  display: "swap",
});

// Secondary font - DM Sans (geometric, friendly)
const dmSans = DM_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm",
  subsets: ["latin"],
  display: "swap",
});

const metadataTitle = "Vehndr — Marketplace for Event Vendors";
const metadataDescription =
  "Discover and book the best vendors for your events. Browse storefronts, add to cart, and checkout seamlessly.";

export const metadata = {
  title: metadataTitle,
  description: metadataDescription,
  openGraph: {
    title: metadataTitle,
    description: metadataDescription,
    images: [
      {
        url: "/Vehndr%20Logo%20Transparent.png",
        width: 1024,
        height: 1024,
        alt: "Vehndr logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: metadataTitle,
    description: metadataDescription,
    images: ["/Vehndr%20Logo%20Transparent.png"],
  },
  icons: {
    icon: "/Vehndr%20Logo%20Transparent.png",
    shortcut: "/Vehndr%20Logo%20Transparent.png",
    apple: "/Vehndr%20Logo%20Transparent.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${outfit.variable} ${dmSans.variable} antialiased`}
      >
        <ClientShell>
            <Navbar />
            <main className="min-h-screen pb-20">{children}</main>
            <Footer />
        </ClientShell>
        <Analytics />
      </body>
    </html>
  );
}
