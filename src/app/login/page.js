"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login, resendVerification } from "../../services/auth";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
import ConfettiBurst from "../../components/ConfettiBurst";

const recaptchaEnabled = !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const ReCAPTCHA = recaptchaEnabled ? require("react-google-recaptcha").default : null;


export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [allowRedirect, setAllowRedirect] = useState(true);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    // Redirect if already logged in
    if (user && allowRedirect) {
      if (user.role === 'vendor') {
        router.push('/dashboard');
      } else if (user.role === 'coordinator') {
        router.push('/coordinator-dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, router, allowRedirect]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailNotVerified(false);
    setResendSuccess(false);
    setShowConfetti(false);
    setAllowRedirect(false);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    // Get reCAPTCHA token (only required when enabled)
    const recaptchaToken = recaptchaEnabled ? recaptchaRef.current?.getValue() : null;
    if (recaptchaEnabled && !recaptchaToken) {
      setError("Please complete the reCAPTCHA verification");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting login with:", email);

      await login({ email, password, recaptchaToken });

      // Refresh the user in AuthContext
      await refreshUser();

      setShowConfetti(true);
      setTimeout(() => setAllowRedirect(true), 900);
    } catch (err) {
      console.error("Login error:", err);
      // Reset reCAPTCHA on error
      if (recaptchaEnabled) recaptchaRef.current?.reset();

      // Check if email not verified
      if (err?.details?.email_not_verified) {
        setEmailNotVerified(true);
        setUnverifiedEmail(email);
        setError(err.details.error || "Please verify your email before logging in");
      } else {
        setError("Invalid email or password");
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;

    setResending(true);
    try {
      await resendVerification(unverifiedEmail);
      setResendSuccess(true);
      setEmailNotVerified(false);
    } catch (err) {
      setError("Failed to send verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    setShowConfetti(false);
    setAllowRedirect(false);

    // Get reCAPTCHA token (only required when enabled)
    const recaptchaToken = recaptchaEnabled ? recaptchaRef.current?.getValue() : null;
    if (recaptchaEnabled && !recaptchaToken) {
      setError("Please complete the reCAPTCHA verification");
      setLoading(false);
      return;
    }

    try {
      await login({ email: "vendor@example.com", password: "password123", recaptchaToken });
      await refreshUser();
      setShowConfetti(true);
      setTimeout(() => setAllowRedirect(true), 900);
    } catch (err) {
      console.error(err);
      // Reset reCAPTCHA on error
      if (recaptchaEnabled) recaptchaRef.current?.reset();
      setError("Demo login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--violet-200)] rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--magenta-200)] rounded-full blur-3xl opacity-30"></div>
      </div>
      
      <div className="relative max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-[var(--radius-3xl)] shadow-[var(--shadow-xl)] p-8 border border-[var(--gray-100)] relative">
          <ConfettiBurst active={showConfetti} />
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="font-display text-3xl tracking-tight text-gradient-primary">
                vehndr
              </span>
            </Link>
            <h2 className="mt-3 text-xl font-semibold text-[var(--gray-900)]">Welcome back</h2>
            <p className="mt-1 text-sm text-[var(--gray-500)]">Sign in to your account to continue</p>
          </div>

          <div className="mb-6">
            <Link href="/register" className="btn btn-gradient w-full">
              Create Account
            </Link>
          </div>

          {/* Success Message - Verification Email Sent */}
          {resendSuccess && (
            <div className="mb-6 p-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-[var(--radius-lg)] text-center flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Verification email sent! Please check your inbox.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-[var(--error)] text-sm rounded-[var(--radius-lg)] text-center">
              <div className="flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
              {emailNotVerified && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="mt-2 text-[var(--violet-600)] hover:text-[var(--violet-700)] font-medium underline disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </button>
              )}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[var(--gray-700)]">
                  Password
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-[var(--violet-600)] hover:text-[var(--violet-700)] font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                required
                className="input"
                placeholder="********"
              />
            </div>

            {recaptchaEnabled && (
              <div className="flex justify-center py-2">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--gray-200)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-[var(--gray-500)]">Or for demo</span>
              </div>
            </div>

            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="mt-6 btn btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Login as Demo Vendor
            </button>
          </div>

        </div>
        
        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--gray-400)]">
          By signing in, you agree to our{" "}
          <Link
            href="/terms"
            className="text-[var(--gray-500)] hover:text-[var(--gray-700)] underline-offset-2 hover:underline"
          >
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-[var(--gray-500)] hover:text-[var(--gray-700)] underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
