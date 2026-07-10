import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { usePublicSettings } from "../../hooks/use-settings";
import { EMAIL_REGEX } from "../../lib/constants";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const { data: settings } = usePublicSettings();
  const businessName = settings?.business_name || "Sunset Country Repairs";
  const logoUrl = settings?.logo_url || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, fullName, phone);
      navigate("/portal");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4 py-12">
      <div className="w-full max-w-md">
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
          <h1 className="font-heading text-3xl font-bold text-warm-900">{businessName}</h1>
          <p className="mt-2 text-warm-500">Create your customer account</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl border border-warm-200 bg-white p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-warm-600">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              placeholder="John Smith"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-warm-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              placeholder="you@example.com"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-warm-600">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              placeholder="0400 000 000"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-warm-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-warm-600">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              placeholder="Confirm your password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent-500 px-4 py-2.5 font-semibold text-white transition hover:bg-accent-600 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
          <p className="mt-4 text-center text-sm text-warm-500">
            Already have an account?{" "}
            <Link to="/login" className="text-accent-500 hover:text-accent-600">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
