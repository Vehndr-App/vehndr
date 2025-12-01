import { Poppins, Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import { CartProvider } from "../contexts/CartContext";
import { AuthProvider } from "../contexts/AuthContext";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vehndr — Marketplace for Event Vendors",
  description: "Vendor storefronts, carts, and checkout for events.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${bebasNeue.variable} ${inter.variable} antialiased`}
      >
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
