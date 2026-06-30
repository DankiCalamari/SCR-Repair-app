import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listRepairs, updateRepairStatus, deleteRepair } from "../../api/repairs";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import type { Repair, RepairStatus } from "../../types";
import {
  Plus, Search, Filter, Trash2, Edit3, ChevronLeft, ChevronRight, Eye
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
    <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-surface-100">Repairs</h1>
            <p className="mt-1 text-surface-400">{data?.total ?? 0} total repairs</p>
          </div>
          <button
            onClick={() => setShowNewRepair(true)}
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 font-semibold text-surface-950 hover:bg-accent-400"
          >
            <Plus className="h-4 w-4" /> New Repair
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search by ticket, description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); } }}
              className="w-full rounded-lg border border-surface-700 bg-surface-800 py-2.5 pl-10 pr-4 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-surface-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-surface-800 bg-surface-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800 text-left text-sm text-surface-400">
                <th className="px-5 py-3 font-medium">Ticket</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Issue</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-40 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-surface-800" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-surface-400">
                    No repairs found
                  </td>
                </tr>
              ) : (
                data?.data?.map((repair: Repair) => (
                  <tr key={repair.id} className="transition hover:bg-surface-800">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-medium text-accent-500">{repair.ticket_number}</span>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={repair.status}
                        onChange={(e) => statusMutation.mutate({ id: repair.id, status: e.target.value })}
                        disabled={statusMutation.isPending}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium focus:outline-none",
                          getStatusColor(repair.status)
                        )}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{getStatusLabel(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-sm text-surface-300">
                      {repair.issue_description}
                    </td>
                    <td className="px-5 py-4 text-sm text-surface-100">
                      {repair.labour_cost || repair.parts_cost
                        ? formatCurrency(Number(repair.labour_cost ?? 0) + Number(repair.parts_cost ?? 0))
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-surface-400">{formatDate(repair.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/repairs/${repair.id}`}
                          className="rounded p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button className="rounded p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-100">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm("Delete this repair?")) deleteMutation.mutate(repair.id); }}
                          className="rounded p-1.5 text-surface-400 hover:bg-surface-800 hover:text-red-400"
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
            <p className="text-sm text-surface-400">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-100 hover:bg-surface-800 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-100 hover:bg-surface-800 disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <NewRepairModal open={showNewRepair} onClose={() => setShowNewRepair(false)} />
    </>
  );
}
