"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../services/auth";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      if (user.role === 'vendor') {
        router.push('/dashboard');
      } else if (user.role === 'coordinator') {
        router.push('/coordinator-dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      console.log("Attempting login with:", email);

      await login({ email, password });

      // Refresh the user in AuthContext
      await refreshUser();

      // Router will redirect based on user role via useEffect
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login({ email: "vendor@example.com", password: "password123" });
      await refreshUser();
      // Router will redirect based on user role via useEffect
    } catch (err) {
      console.error(err);
      setError("Demo login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl tracking-wide mb-2">
            <span className="bg-gradient-to-r from-[#01DBE0] via-[#FD237A] to-[#FE9C05] bg-clip-text text-transparent">
              VEHNDR
            </span>
          </h1>
          <h2 className="text-xl font-semibold text-gray-800">Login</h2>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#01DBE0] focus:ring-2 focus:ring-[#01DBE0]/20 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#01DBE0] focus:ring-2 focus:ring-[#01DBE0]/20 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-black text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or for demo</span>
            </div>
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-lg border-2 border-black/5 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Login as Demo Vendor
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#01DBE0] hover:text-[#FD237A] font-semibold transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
