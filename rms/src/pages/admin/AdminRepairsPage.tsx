import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listRepairs, updateRepairStatus, deleteRepair } from "../../api/repairs";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import type { Repair, RepairStatus } from "../../types";
import {
  Plus, Search, Filter, Trash2, Edit3, ChevronLeft, ChevronRight, Eye, Wrench as WrenchIcon
} from "lucide-react";
import NewRepairModal from "../../components/admin/NewRepairModal";

const STATUSES: RepairStatus[] = [
  "lead", "device_received", "diagnosing", "waiting_for_customer",
  "waiting_for_parts", "in_progress", "repaired", "ready_for_collection",
  "completed", "cancelled",
];

export default function AdminRepairsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showNewRepair, setShowNewRepair] = useState(false);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-repairs", page, statusFilter, search],
    queryFn: () => listRepairs(page * pageSize, pageSize, statusFilter || undefined, search || undefined),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      updateRepairStatus(id, { status, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-repairs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRepair(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-repairs"] }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <>
    <div className="min-h-screen bg-warm-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-warm-50">Repairs</h1>
            <p className="mt-1 text-warm-400">{data?.total ?? 0} total repairs in system</p>
          </div>
          <button
            onClick={() => setShowNewRepair(true)}
            className="flex items-center gap-2 rounded-lg bg-copper-500 px-5 py-2.5 font-semibold text-warm-950 transition-all duration-200 hover:bg-copper-600 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" /> New Repair
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-warm-500" />
            <input
              type="text"
              placeholder="Search by ticket, description, customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); } }}
              className="w-full rounded-lg border border-warm-700 bg-warm-900/80 py-2.5 pl-11 pr-4 text-warm-100 placeholder-warm-500 transition-all focus:border-copper-500 focus:outline-none focus:ring-2 focus:ring-copper-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-warm-500" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="rounded-lg border border-warm-700 bg-warm-900/80 px-4 py-2.5 text-warm-100 transition-all focus:border-copper-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-warm-800/50 bg-warm-900/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-warm-800/50 bg-warm-900/80 text-left text-sm font-medium text-warm-400">
                <th className="px-5 py-4">Ticket</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Issue</th>
                <th className="px-5 py-4">Cost</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-800/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="h-5 w-24 animate-pulse rounded-md bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 animate-pulse rounded-md bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-40 animate-pulse rounded-md bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-16 animate-pulse rounded-md bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-24 animate-pulse rounded-md bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 animate-pulse rounded-md bg-warm-800" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <WrenchIcon className="h-12 w-12 text-warm-700" />
                      <p className="text-warm-400">No repairs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((repair: Repair) => (
                  <tr key={repair.id} className="transition-colors hover:bg-warm-800/30">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-semibold text-copper-500">{repair.ticket_number}</span>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={repair.status}
                        onChange={(e) => statusMutation.mutate({ id: repair.id, status: e.target.value })}
                        disabled={statusMutation.isPending}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-copper-500/20",
                          getStatusColor(repair.status)
                        )}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{getStatusLabel(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-sm text-warm-300">
                      {repair.issue_description}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-warm-200">
                      {repair.labour_cost || repair.parts_cost
                        ? formatCurrency(Number(repair.labour_cost ?? 0) + Number(repair.parts_cost ?? 0))
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-warm-400">{formatDate(repair.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/repairs/${repair.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-warm-400 transition-colors hover:bg-warm-800 hover:text-warm-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button 
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-warm-400 transition-colors hover:bg-warm-800 hover:text-warm-100"
                          title="Edit repair"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm("Delete this repair?")) deleteMutation.mutate(repair.id); }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-warm-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="Delete repair"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-warm-400">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 rounded-lg border border-warm-700 px-4 py-2 text-sm font-medium text-warm-200 transition-colors hover:bg-warm-800 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1.5 rounded-lg border border-warm-700 px-4 py-2 text-sm font-medium text-warm-200 transition-colors hover:bg-warm-800 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <NewRepairModal open={showNewRepair} onClose={() => setShowNewRepair(false)} />
    </div>
    </>
  );
}
