import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Wrench } from "lucide-react";

export default function SetupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/public/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password, phone }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Setup failed");
      }

      setIsSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Setup failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Logo Area */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-copper-500">
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-warm-900">
            Sunset Country Repairs
          </h1>
          <p className="mt-2 text-warm-500">Initial Setup</p>
        </div>

        {/* Setup Card */}
        <div className="rounded-xl border border-warm-200 bg-white p-8 shadow-xl">
          {isSuccess ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 font-heading text-xl font-semibold text-warm-900">
                Setup Complete!
              </h2>
              <p className="mt-2 text-warm-500">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <p className="text-sm text-warm-600">
                Create your admin account to get started. This is the first and only time you'll see this screen.
              </p>

              {/* Full Name Field */}
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-warm-600">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                  disabled={isLoading}
                  className="w-full rounded-lg border border-warm-200 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 outline-none transition-colors focus:border-copper-500 focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-warm-600">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  className="w-full rounded-lg border border-warm-200 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 outline-none transition-colors focus:border-copper-500 focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
                />
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  required
                  disabled={isLoading}
                  className="w-full rounded-lg border border-warm-200 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 outline-none transition-colors focus:border-copper-500 focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
                />
              </div>

              {/* Phone Field (Optional) */}
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-warm-600">
                  Phone (Optional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0400 123 456"
                  disabled={isLoading}
                  className="w-full rounded-lg border border-warm-200 bg-warm-100 px-4 py-2.5 text-warm-900 placeholder-warm-400 outline-none transition-colors focus:border-copper-500 focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-lg bg-copper-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-copper-600 focus:outline-none focus:ring-2 focus:ring-copper-500 focus:ring-offset-2 focus:ring-offset-warm-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                    Creating account...
                  </>
                ) : (
                  "Create Admin Account"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-warm-400">
          Sunset Country Repairs &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}