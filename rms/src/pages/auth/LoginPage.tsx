import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { useSettings } from "../../hooks/use-settings";
import { useFavicon } from "../../hooks/use-favicon";
import { EMAIL_REGEX } from "../../lib/constants";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  useFavicon();
  const logoUrl = settings?.logo_url;
  const businessName = settings?.business_name || "Sunset Country Repairs";

  if (isAuthenticated && user) {
    if (user.role === "admin" || user.role === "staff") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/portal", { replace: true });
    }
    return null;
  }

  function validate(): boolean {
    let valid = true;
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    }

    return valid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === "admin" || currentUser?.role === "staff") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/portal", { replace: true });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please check your credentials and try again.";
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Logo Area */}
        <div className="mb-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="mx-auto mb-4 h-16 w-auto object-contain"
            />
          ) : (
            <img
              src="/app/static/logo.svg"
              alt={businessName}
              className="mx-auto mb-4 h-12 w-auto object-contain"
            />
          )}
          <h1 className="font-heading text-3xl font-bold text-warm-900">
            {businessName}
          </h1>
          <p className="mt-2 text-warm-500">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-warm-200 bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-warm-600">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                className={`w-full rounded-lg border bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 outline-none transition-colors focus:border-accent-500 focus:ring-1 focus:ring-accent-500 disabled:opacity-50 ${
                  emailError ? "border-red-500" : "border-warm-200"
                }`}
              />
              {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-warm-600">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                className={`w-full rounded-lg border bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 outline-none transition-colors focus:border-accent-500 focus:ring-1 focus:ring-accent-500 disabled:opacity-50 ${
                  passwordError ? "border-red-500" : "border-warm-200"
                }`}
              />
              {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-accent-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-warm-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center text-sm text-warm-500">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-medium text-accent-500 hover:text-accent-600">
              Register
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-warm-400 hover:text-warm-600">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
