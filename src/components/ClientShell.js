"use client";

import dynamic from "next/dynamic";
import { CartProvider } from "../contexts/CartContext";
import { AuthProvider } from "../contexts/AuthContext";

const ImpersonationBanner = dynamic(() => import("./ImpersonationBanner"), { ssr: false });
const BottomNav = dynamic(() => import("./BottomNav"), { ssr: false });
const EventBestie = dynamic(() => import("./EventBestie"), { ssr: false });

export default function ClientShell({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ImpersonationBanner />
        {children}
        <BottomNav />
        <EventBestie />
      </CartProvider>
    </AuthProvider>
  );
}
