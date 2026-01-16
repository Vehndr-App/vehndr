"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmail, resendVerification } from "../../services/auth";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--violet-200)] rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--magenta-200)] rounded-full blur-3xl opacity-30"></div>
      </div>
      <div className="relative max-w-md w-full">
        <div className="bg-white rounded-[var(--radius-3xl)] shadow-[var(--shadow-xl)] p-8 border border-[var(--gray-100)]">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="font-display text-3xl tracking-tight text-gradient-primary">vehndr</h1>
            </Link>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-[var(--violet-600)]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--gray-900)]">Loading...</h2>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState("verifying"); // verifying, success, error, resent
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setError("No verification token provided");
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail(token);
        setStatus("success");
        await refreshUser();
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (err) {
        setStatus("error");
        setError(err?.details?.error || "Verification failed. The link may be expired or invalid.");
      }
    };

    verify();
  }, [searchParams, refreshUser, router]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) return;

    setResending(true);
    try {
      await resendVerification(email);
      setStatus("resent");
    } catch (err) {
      setError("Failed to send verification email. Please try again.");
    } finally {
      setResending(false);
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
        <div className="bg-white rounded-[var(--radius-3xl)] shadow-[var(--shadow-xl)] p-8 border border-[var(--gray-100)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="font-display text-3xl tracking-tight text-gradient-primary">
                vehndr
              </h1>
            </Link>
          </div>

          {/* Verifying State */}
          {status === "verifying" && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-[var(--violet-600)]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--gray-900)]">Verifying your email...</h2>
              <p className="mt-2 text-sm text-[var(--gray-500)]">Please wait while we verify your email address.</p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--gray-900)]">Email Verified!</h2>
              <p className="mt-2 text-sm text-[var(--gray-500)]">Your email has been verified successfully. Redirecting to your dashboard...</p>
            </div>
          )}

          {/* Resent State */}
          {status === "resent" && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--gray-900)]">Verification Email Sent!</h2>
              <p className="mt-2 text-sm text-[var(--gray-500)]">If an account exists with that email, a new verification link has been sent. Please check your inbox.</p>
              <Link href="/login" className="btn btn-primary w-full mt-6">
                Go to Login
              </Link>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--gray-900)]">Verification Failed</h2>
              <p className="mt-2 text-sm text-[var(--error)]">{error}</p>

              {/* Resend Form */}
              <div className="mt-6 pt-6 border-t border-[var(--gray-200)]">
                <p className="text-sm text-[var(--gray-600)] mb-4">Need a new verification link?</p>
                <form onSubmit={handleResend} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input"
                    placeholder="Enter your email"
                  />
                  <button
                    type="submit"
                    disabled={resending}
                    className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Resend Verification Email"
                    )}
                  </button>
                </form>
              </div>

              <Link href="/login" className="block mt-4 text-sm text-[var(--violet-600)] hover:text-[var(--violet-700)] font-medium">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
