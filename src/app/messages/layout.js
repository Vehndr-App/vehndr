"use client";

import BuyerLayout from "../../components/BuyerLayout";
import { useAuth } from "../../contexts/AuthContext";

export default function MessagesLayout({ children }) {
  const { user } = useAuth();
  if (user?.role === "vendor") return <>{children}</>;
  return <BuyerLayout>{children}</BuyerLayout>;
}
