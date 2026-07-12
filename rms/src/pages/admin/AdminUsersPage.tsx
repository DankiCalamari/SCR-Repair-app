import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "../../lib/utils";
import type { User } from "../../types";
import { Search, ChevronLeft, ChevronRight, Shield, User as UserIcon, UserCheck, UserX, Link as LinkIcon, Plus, X } from "lucide-react";
import apiClient from "../../api/client";
import { cn } from "../../lib/utils";

async function fetchUsers(skip: number, limit: number, search?: string) {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (search) params.append("search", search);
  const { data } = await apiClient.get(`/admin/users?${params.toString()}`);
  return data;
}

async function updateUserRole(userId: string, role: string) {
  const { data } = await apiClient.put(`/admin/${userId}?role=${role}`);
  return data;
}

async function createUser(email: string, fullName: string, password: string, role: string) {
  const { data } = await apiClient.post("/admin/users", {
    email,
    full_name: fullName,
    password,
    role,
  });
  return data;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("staff");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => fetchUsers(page * pageSize, pageSize, search || undefined),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const createMutation = useMutation({
    mutationFn: () => createUser(newUserEmail, newUserFullName, newUserPassword, newUserRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowNewUser(false);
      setNewUserEmail("");
      setNewUserFullName("");
      setNewUserPassword("");
      setNewUserRole("staff");
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to create user: ${message || "Unknown error"}`);
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const handleRoleChange = (userId: string, newRole: string) => {
    if (confirm(`Change this user's role to ${newRole}?`)) {
      roleMutation.mutate({ userId, role: newRole });
    }
  };

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserPassword) {
      alert("Email and password are required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-rms-text">User Management</h1>
            <p className="mt-1 text-rms-text-secondary">{data?.total ?? 0} total users</p>
            </div>
          <button
            onClick={() => setShowNewUser(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
          </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rms-text-secondary" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); }}}
              className="w-full rounded-lg border border-rms-border bg-rms-surface py-2.5 pl-10 pr-4 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
            />
            </div>
          </div>

</div>
        <div className="overflow-x-auto rounded-lg border border-rms-border bg-rms-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rms-border text-left text-sm text-rms-text-secondary">
              <th className="px-5 py-3 font-medium">Name / Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">SSO</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Last Login</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rms-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-40 rounded bg-rms-raised" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-rms-raised" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-rms-raised" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-rms-raised" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-rms-raised" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-rms-raised" /></td>
                </tr>
              ))
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-rms-text-secondary">
                  No users found
                </td>
              </tr>
            ) : (
              data?.data?.map((user: User) => (
                <tr key={user.id} className="transition hover:bg-rms-raised">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-500">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </div>
                      <div>
                        <span className="font-medium text-rms-text">{user.full_name || "—"}</span>
                        <div className="text-sm text-rms-text-secondary">{user.email}</div>
                        </div>
                      </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      user.role === "admin" ? "bg-brand-500/20 text-copper-400" :
                      user.role === "staff" ? "bg-blue-500/20 text-blue-400" :
                      "bg-rms-raised text-rms-text-secondary"
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {user.sso_provider ? (
                      <span className="flex items-center gap-1.5 text-xs text-copper-400">
                        <LinkIcon className="h-3.5 w-3.5" />
                        {user.sso_provider}
                      </span>
                    ) : (
                      <span className="text-xs text-rms-text0">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "flex items-center gap-1.5 text-xs",
                      user.is_active ? "text-green-400" : "text-red-400"
                    )}>
                      {user.is_active ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-rms-text-secondary">
                    {user.last_login ? formatDate(user.last_login) : "Never"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleRoleChange(user.id, "admin")}
                          disabled={roleMutation.isPending}
                          className="rounded p-1.5 text-rms-text-secondary hover:bg-brand-500/10 hover:text-copper-400"
                          title="Make Admin"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                      )}
                      {user.role !== "staff" && (
                        <button
                          onClick={() => handleRoleChange(user.id, "staff")}
                          disabled={roleMutation.isPending}
                          className="rounded p-1.5 text-rms-text-secondary hover:bg-blue-500/10 hover:text-blue-400"
                          title="Make Staff"
                        >
                          <UserIcon className="h-4 w-4" />
                        </button>
                      )}
                      </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-rms-text-secondary">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 rounded-lg border border-rms-border px-3 py-2 text-sm text-rms-text hover:bg-rms-raised disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 rounded-lg border border-rms-border px-3 py-2 text-sm text-rms-text hover:bg-rms-raised disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
            </div>
          </div>
      )}

      {/* Add User Modal */}
      {showNewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-rms-border bg-rms-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-rms-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-rms-text">Add New User</h2>
              <button onClick={() => setShowNewUser(false)} className="text-rms-text-secondary hover:text-rms-text">
                <X className="h-5 w-5" />
              </button>
              </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Email *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  placeholder="user@example.com"
                />
                </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Full Name</label>
                <input
                  type="text"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  placeholder="John Doe"
                />
                </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Password *</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  placeholder="••••••••"
                />
                </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
                </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNewUser(false)}
                  className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={createMutation.isPending || !newUserEmail || !newUserPassword}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </button>
                </div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}