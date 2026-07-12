import { useState } from "react";
import { useAuthStore } from "../../store/auth-store";

export default function PortalProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Profile updated successfully.");
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setMessage("Password changed successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-8 font-heading text-3xl font-bold text-rms-text">My Profile</h1>

        {message && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mb-8 rounded-lg border border-warm-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-rms-text">Profile Information</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rms-text-secondary">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-rms-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-copper-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rms-text-secondary">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full rounded-lg border border-warm-300 bg-warm-100/50 px-4 py-2.5 text-rms-text0 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-rms-text-secondary">Email cannot be changed. Contact support.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rms-text-secondary">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-rms-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-copper-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-600"
            >
              Update Profile
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-warm-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-rms-text">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rms-text-secondary">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-rms-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-copper-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rms-text-secondary">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-rms-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-copper-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rms-text-secondary">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-warm-300 bg-warm-100 px-4 py-2.5 text-rms-text focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-copper-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-600"
            >
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

