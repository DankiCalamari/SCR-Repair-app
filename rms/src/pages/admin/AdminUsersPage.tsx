import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "../../lib/utils";
import type { User } from "../../types";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Shield, User as UserIcon, UserCheck, UserX, Link as LinkIcon } from "lucide-react";
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

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => fetchUsers(page * pageSize, pageSize, search || undefined),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const handleRoleChange = (userId: string, newRole: string) => {
    if (confirm(`Change this user's role to ${newRole}?`)) {
      roleMutation.mutate({ userId, role: newRole });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-warm-100">User Management</h1>
          <p className="mt-1 text-warm-400">{data?.total ?? 0} total users</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); }}}
            className="w-full rounded-lg border border-warm-700 bg-warm-900 py-2.5 pl-10 pr-4 text-warm-100 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-warm-700 bg-warm-950">
        <table className="w-full">
          <thead>
            <tr className="border-b border-warm-700 text-left text-sm text-warm-400">
              <th className="px-5 py-3 font-medium">Name / Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">SSO</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Last Login</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-700">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-40 rounded bg-warm-800" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-warm-800" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-warm-800" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-warm-800" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-warm-800" /></td>
                  <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-warm-800" /></td>
                </tr>
              ))
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-warm-400">
                  No users found
                </td>
              </tr>
            ) : (
              data?.data?.map((user: User) => (
                <tr key={user.id} className="transition hover:bg-warm-800">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-copper-500/10 text-sm font-bold text-copper-500">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-warm-100">{user.full_name || "—"}</span>
                        <div className="text-sm text-warm-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      user.role === "admin" ? "bg-copper-500/20 text-copper-400" :
                      user.role === "staff" ? "bg-blue-500/20 text-blue-400" :
                      "bg-warm-700 text-warm-300"
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
                      <span className="text-xs text-warm-500">—</span>
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
                  <td className="px-5 py-4 text-sm text-warm-400">
                    {user.last_login ? formatDate(user.last_login) : "Never"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleRoleChange(user.id, "admin")}
                          disabled={roleMutation.isPending}
                          className="rounded p-1.5 text-warm-400 hover:bg-copper-500/10 hover:text-copper-400"
                          title="Make Admin"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                      )}
                      {user.role !== "staff" && (
                        <button
                          onClick={() => handleRoleChange(user.id, "staff")}
                          disabled={roleMutation.isPending}
                          className="rounded p-1.5 text-warm-400 hover:bg-blue-500/10 hover:text-blue-400"
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
          <p className="text-sm text-warm-400">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 rounded-lg border border-warm-700 px-3 py-2 text-sm text-warm-100 hover:bg-warm-800 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 rounded-lg border border-warm-700 px-3 py-2 text-sm text-warm-100 hover:bg-warm-800 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}