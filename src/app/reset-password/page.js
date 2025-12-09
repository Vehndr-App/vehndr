"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../services/api";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidatingToken(false);
        return;
      }

      try {
        await api(`/api/password/validate_token?token=${token}`);
        setTokenValid(true);
      } catch (err) {
        console.error("Token validation error:", err);
        setTokenValid(false);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api("/api/password/reset", {
        method: "POST",
        body: { token, password, password_confirmation: confirmPassword }
      });
      setSuccess(true);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err?.details?.error || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;

    const levels = [
      { strength: 0, label: "", color: "" },
      { strength: 1, label: "Weak", color: "bg-red-500" },
      { strength: 2, label: "Fair", color: "bg-amber-500" },
      { strength: 3, label: "Good", color: "bg-[var(--mint-500)]" },
      { strength: 4, label: "Strong", color: "bg-[var(--violet-500)]" },
    ];

    return levels[strength];
  };

  const passwordStrength = getPasswordStrength();

  // Loading state
  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-3 border-[var(--violet-500)] border-t-transparent rounded-full animate-spin"/>
          <p className="mt-4 text-[var(--gray-500)]">Validating your reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid or missing token
  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--violet-200)] rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--magenta-200)] rounded-full blur-3xl opacity-30"></div>
        </div>
        
        <div className="relative max-w-md w-full">
          <div className="bg-white rounded-[var(--radius-3xl)] shadow-[var(--shadow-xl)] p-8 border border-[var(--gray-100)] text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Invalid or Expired Link</h2>
            <p className="text-[var(--gray-500)] mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>

            <div className="space-y-3">
              <Link href="/forgot-password" className="btn btn-primary w-full">
                Request New Link
              </Link>
              <Link href="/login" className="btn btn-outline w-full">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--violet-200)] rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--magenta-200)] rounded-full blur-3xl opacity-30"></div>
        </div>
        
        <div className="relative max-w-md w-full">
          <div className="bg-white rounded-[var(--radius-3xl)] shadow-[var(--shadow-xl)] p-8 border border-[var(--gray-100)] text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--mint-100)] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Password Reset!</h2>
            <p className="text-[var(--gray-500)] mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>

            <Link href="/login" className="btn btn-primary w-full">
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--violet-200)] rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--magenta-200)] rounded-full blur-3xl opacity-30"></div>
      </div>
      
      <div className="relative max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-[var(--radius-3xl)] shadow-[var(--shadow-xl)] p-8 border border-[var(--gray-100)]">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="font-display text-3xl tracking-tight text-gradient-primary">
                vehndr
              </h1>
            </Link>
            <h2 className="mt-3 text-xl font-semibold text-[var(--gray-900)]">Create new password</h2>
            <p className="mt-1 text-sm text-[var(--gray-500)]">
              Enter a new password for your account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-[var(--error)] text-sm rounded-[var(--radius-lg)] text-center flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                New Password
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input pl-12 pr-12"
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-600)]"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          level <= passwordStrength.strength
                            ? passwordStrength.color
                            : "bg-[var(--gray-200)]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--gray-500)]">
                    Password strength: <span className="font-medium">{passwordStrength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input pl-12"
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-[var(--error)]">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Resetting...
                </span>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          {/* Password requirements */}
          <div className="mt-6 p-4 bg-[var(--gray-50)] rounded-[var(--radius-lg)]">
            <p className="text-xs font-medium text-[var(--gray-700)] mb-2">Password requirements:</p>
            <ul className="text-xs text-[var(--gray-500)] space-y-1">
              <li className="flex items-center gap-2">
                <span className={password.length >= 8 ? "text-[var(--mint-500)]" : ""}>
                  {password.length >= 8 ? "✓" : "○"}
                </span>
                At least 8 characters
              </li>
              <li className="flex items-center gap-2">
                <span className={password.match(/[a-z]/) && password.match(/[A-Z]/) ? "text-[var(--mint-500)]" : ""}>
                  {password.match(/[a-z]/) && password.match(/[A-Z]/) ? "✓" : "○"}
                </span>
                Upper and lowercase letters
              </li>
              <li className="flex items-center gap-2">
                <span className={password.match(/\d/) ? "text-[var(--mint-500)]" : ""}>
                  {password.match(/\d/) ? "✓" : "○"}
                </span>
                At least one number
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-12 h-12 border-3 border-[var(--violet-500)] border-t-transparent rounded-full animate-spin"/>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

