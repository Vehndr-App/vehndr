"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../services/auth";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState("vendor");

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      if (user.role === 'vendor') {
        router.push('/dashboard');
      } else if (user.role === 'coordinator') {
        router.push('/coordinator-dashboard');
      }
    }
  }, [user, router]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");
    const passwordConfirmation = formData.get("passwordConfirmation");
    const name = formData.get("name");
    const role = formData.get("role");

    // Client-side validation
    if (password !== passwordConfirmation) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting registration with:", email, role);

      await register({
        email,
        password,
        passwordConfirmation,
        name: name || undefined,
        role
      });

      // Refresh the user in AuthContext
      await refreshUser();

      // Router will redirect based on user role via useEffect
    } catch (err) {
      console.error("Registration error:", err);
      // Display backend validation errors if available
      if (err?.details?.errors && Array.isArray(err.details.errors)) {
        setError(err.details.errors.join(", "));
      } else if (err?.details?.error) {
        setError(err.details.error);
      } else {
        setError("Registration failed. Please try again.");
      }
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
          <h2 className="text-xl font-semibold text-gray-800">Create Account</h2>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
            <input
              type="text"
              name="name"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#01DBE0] focus:ring-2 focus:ring-[#01DBE0]/20 outline-none transition-all"
              placeholder="Your name"
            />
          </div>

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
              minLength="6"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#01DBE0] focus:ring-2 focus:ring-[#01DBE0]/20 outline-none transition-all"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              name="passwordConfirmation"
              required
              minLength="6"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#01DBE0] focus:ring-2 focus:ring-[#01DBE0]/20 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">I am a...</label>
            <div className="space-y-2">
              <label className="flex items-center p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-[#FD237A] transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="vendor"
                  checked={selectedRole === "vendor"}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4 text-[#FD237A] focus:ring-[#FD237A]"
                />
                <div className="ml-3">
                  <span className="block font-medium text-gray-900">Vendor</span>
                  <span className="block text-xs text-gray-500">Sell products and manage inventory</span>
                </div>
              </label>

              <label className="flex items-center p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-[#FE9C05] transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="coordinator"
                  checked={selectedRole === "coordinator"}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4 text-[#FE9C05] focus:ring-[#FE9C05]"
                />
                <div className="ml-3">
                  <span className="block font-medium text-gray-900">Event Coordinator</span>
                  <span className="block text-xs text-gray-500">Organize and manage events</span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-black text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[#01DBE0] hover:text-[#FD237A] font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
