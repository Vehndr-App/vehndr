"use client";

import { usePathname } from "next/navigation";
import BuyerLayout from "../../components/BuyerLayout";
import { useAuth } from "../../contexts/AuthContext";

export default function MessagesLayout({ children }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // The conversation thread (/messages/[id]) is an immersive, full-height view with
  // its own header, offer sidebar and mobile tabs. Render it without the dashboard
  // chrome (sidebar + footer + min-h-screen wrapper) so it fills the viewport and
  // pins its composer on mobile. The list (/messages) keeps the buyer chrome.
  const isThread = !!pathname && pathname !== "/messages";

  if (user?.role === "vendor" || isThread) return <>{children}</>;
  return <BuyerLayout>{children}</BuyerLayout>;
}
