"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { CartProvider } from "../contexts/CartContext";
import { AuthProvider } from "../contexts/AuthContext";
import Navbar from "./Navbar";

const ImpersonationBanner = dynamic(() => import("./ImpersonationBanner"), { ssr: false });
const BottomNav = dynamic(() => import("./BottomNav"), { ssr: false });
const EventBestie = dynamic(() => import("./EventBestie"), { ssr: false });
const Footer = dynamic(() => import("./Footer"));

export default function ClientShell({ children }) {
  const pathname = usePathname();

  // The messaging screens are immersive and full-height: the chat thread sizes
  // itself to the viewport and pins its own composer. The marketing footer + the
  // global bottom padding (which clears the BottomNav on normal pages) would push
  // that layout taller than the screen and un-pin the composer on mobile, and the
  // floating EventBestie bubble would cover the input — so skip all of it here.
  const isMessages = pathname?.startsWith("/messages") ?? false;

  return (
    <AuthProvider>
      <CartProvider>
        <ImpersonationBanner />
        <Navbar />
        <main className={isMessages ? "" : "min-h-screen pb-20"}>{children}</main>
        {!isMessages && <Footer />}
        <BottomNav />
        {!isMessages && <EventBestie />}
      </CartProvider>
    </AuthProvider>
  );
}
