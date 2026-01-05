import { Plus_Jakarta_Sans, DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import EventBestie from "../components/EventBestie";
import { CartProvider } from "../contexts/CartContext";
import { AuthProvider } from "../contexts/AuthContext";
import { Analytics } from "@vercel/analytics/next"
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

export const metadata = {
  title: "Vehndr — Marketplace for Event Vendors",
  description: "Discover and book the best vendors for your events. Browse storefronts, add to cart, and checkout seamlessly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${outfit.variable} ${dmSans.variable} antialiased`}
      >
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-screen pb-20">{children}</main>
            <BottomNav />
            <EventBestie />
          </CartProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
