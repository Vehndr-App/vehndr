"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../services/auth";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
import ConfettiBurst from "../../components/ConfettiBurst";

export default function RegisterPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedRole, setSelectedRole] = useState("vendor");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const recaptchaRef = useRef(null);

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
    const businessName = formData.get("businessName");
    const role = formData.get("role");

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'register/page.js:47',message:'handleRegister start',data:{hasEmail:!!email,role,hasPassword:!!password,hasPasswordConfirmation:!!passwordConfirmation,hasRecaptchaRef:!!recaptchaRef.current},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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

    // Get reCAPTCHA token
    const recaptchaToken = recaptchaRef.current?.getValue();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'register/page.js:68',message:'recaptcha token checked',data:{hasRecaptchaToken:!!recaptchaToken},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA verification");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting registration with:", email, role);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'register/page.js:77',message:'calling register()',data:{role,hasRecaptchaToken:!!recaptchaToken},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      await register({
        email,
        password,
        passwordConfirmation,
        name,
        businessName,
        role,
        recaptchaToken
      });

      // Show success message - user needs to verify email
      setSuccess(true);
      setShowConfetti(true);
      setLoading(false);
    } catch (err) {
      console.error("Registration error:", err);
      // Reset reCAPTCHA on error
      recaptchaRef.current?.reset();

      // Display backend or network errors if available
      if (err?.details?.errors && Array.isArray(err.details.errors)) {
        setError(err.details.errors.join(", "));
      } else if (err?.details?.error) {
        setError(err.details.error);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
      setLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4 py-8">
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
            <h2 className="mt-3 text-xl font-semibold text-[var(--gray-900)]">Create Account</h2>
            <p className="mt-1 text-sm text-[var(--gray-500)]">Join the marketplace and start connecting</p>
          </div>

          {/* Success Message - Email Verification Required */}
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--gray-900)]">Check your email!</h2>
              <p className="mt-3 text-sm text-[var(--gray-600)]">
                We&apos;ve sent a verification link to your email address. Please click the link to verify your account.
              </p>
              <p className="mt-2 text-xs text-[var(--gray-500)]">
                The link will expire in 24 hours.
              </p>
              <Link href="/login" className="btn btn-primary w-full mt-6">
                Go to Login
              </Link>
            </div>
          ) : (
            <>
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

              <div className="mb-6">
                <Link href="/login" className="btn btn-gradient w-full">
                  Sign In Instead
                </Link>
              </div>

              {/* Register Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required
                className="input"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Business Name
              </label>
              <input
                type="text"
                name="businessName"
                required
                className="input"
                placeholder="Your business or organization name"
              />
            </div>

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
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength="6"
                  className="input pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[var(--gray-500)]">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="passwordConfirmation"
                  required
                  minLength="6"
                  className="input pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-3">
                I am a...
              </label>
              <div className="space-y-3">
                {/* Vendor Option */}
                <label 
                  className={`flex items-center justify-between p-4 rounded-[var(--radius-xl)] border-2 cursor-pointer transition-all duration-200 ${
                    selectedRole === "vendor" 
                      ? "border-[var(--violet-500)] bg-[var(--violet-50)]" 
                      : "border-[var(--gray-200)] hover:border-[var(--violet-300)] hover:bg-[var(--gray-50)]"
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="vendor"
                      checked={selectedRole === "vendor"}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 text-[var(--violet-600)] focus:ring-[var(--violet-500)] border-[var(--gray-300)]"
                    />
                    <div className="ml-3">
                      <span className="block font-semibold text-[var(--gray-900)]">Vendor</span>
                      <span className="block text-xs text-[var(--gray-500)] mt-0.5">Sell products and manage inventory</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-gradient-primary flex items-center justify-center shadow-[var(--shadow-button)]">
                    <span className="text-2xl">🏪</span>
                  </div>
                </label>

                {/* Event Organizer Option */}
                <label 
                  className={`flex items-center justify-between p-4 rounded-[var(--radius-xl)] border-2 cursor-pointer transition-all duration-200 ${
                    selectedRole === "coordinator" 
                      ? "border-[var(--magenta-500)] bg-[var(--magenta-50)]" 
                      : "border-[var(--gray-200)] hover:border-[var(--magenta-300)] hover:bg-[var(--gray-50)]"
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="coordinator"
                      checked={selectedRole === "coordinator"}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 text-[var(--magenta-600)] focus:ring-[var(--magenta-500)] border-[var(--gray-300)]"
                    />
                    <div className="ml-3">
                      <span className="block font-semibold text-[var(--gray-900)]">Event Organizer</span>
                      <span className="block text-xs text-[var(--gray-500)] mt-0.5">Organize and manage events</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-gradient-sunset flex items-center justify-center shadow-[var(--shadow-md)]">
                    <span className="text-2xl">🎪</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-center py-2">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
              />
            </div>

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
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

            </>
          )}
        </div>
        
        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--gray-400)]">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
