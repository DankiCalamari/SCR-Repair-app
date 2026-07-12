import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listRepairs, updateRepairStatus, deleteRepair } from "../../api/repairs";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import type { Repair, RepairStatus } from "../../types";
import {
  Plus, Search, Filter, Trash2, ChevronLeft, ChevronRight, Eye, Wrench as WrenchIcon, Archive
} from "lucide-react";
import NewRepairModal from "../../components/admin/NewRepairModal";

const ACTIVE_STATUSES: RepairStatus[] = [
  "lead", "device_received", "diagnosing", "waiting_for_customer",
  "waiting_for_parts", "in_progress", "repaired", "ready_for_collection",
];

const COMPLETED_STATUSES: RepairStatus[] = ["completed", "cancelled"];

type Tab = "active" | "completed";

export default function AdminRepairsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("active");
  const [activePage, setActivePage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showNewRepair, setShowNewRepair] = useState(false);
  const pageSize = 20;

  // Reset pages when tab changes
  useEffect(() => {
    if (tab === "active") setCompletedPage(0);
  }, [tab]);

  const currentPage = tab === "active" ? activePage : completedPage;
  const currentPageSkip = useMemo(() => currentPage * pageSize, [currentPage, pageSize]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-repairs", currentPageSkip, tab, statusFilter, search],
    queryFn: () => listRepairs(
      currentPageSkip,
      pageSize,
      tab === "active" ? (statusFilter || undefined) : "completed",
      search || undefined
    ),
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

  // Reset to page 0 when filters change
  const handleSearch = () => {
    setSearch(searchInput);
    setActivePage(0);
    setCompletedPage(0);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setActivePage(0);
    setCompletedPage(0);
  };

  // Tab change handler
  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setActivePage(0);
    setCompletedPage(0);
  };

  return (
    <>
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-rms-text">Repairs</h1>
            <p className="mt-1 text-rms-text-secondary">{data?.total ?? 0} {tab === "active" ? "active" : "completed"} repairs in system</p>
          </div>
          <button
            onClick={() => setShowNewRepair(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white transition-all duration-200 hover:bg-brand-600 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" /> New Repair
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-rms-border pb-px">
          <button
            key="active"
            onClick={() => handleTabChange("active")}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition",
              tab === "active" ? "border-b-2 border-brand-500 text-brand-500" : "text-rms-text-secondary hover:text-rms-text"
            )}
          >
            <WrenchIcon className="h-4 w-4" /> Active Repairs
          </button>
          <button
            key="completed"
            onClick={() => handleTabChange("completed")}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition",
              tab === "completed" ? "border-b-2 border-brand-500 text-brand-500" : "text-rms-text-secondary hover:text-rms-text"
            )}
          >
            <Archive className="h-4 w-4" /> Completed / Cancelled
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-rms-text0" />
            <input
              type="text"
              placeholder="Search by ticket, description, customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { handleSearch(); } }}
              className="w-full rounded-lg border border-rms-border bg-rms-surface/80 py-2.5 pl-11 pr-4 text-rms-text placeholder-rms-text-secondary transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {tab === "active" && (
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-rms-text0" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="rounded-lg border border-rms-border bg-rms-surface/80 px-4 py-2.5 text-rms-text transition-all focus:border-brand-500 focus:outline-none"
              >
                <option value="">All Active Statuses</option>
                {ACTIVE_STATUSES.map((s) => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-rms-border/50 bg-rms-surface/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-rms-border/50 bg-rms-surface/80 text-left text-sm font-medium text-rms-text-secondary">
                <th className="px-5 py-4">Ticket</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Issue</th>
                <th className="px-5 py-4">Cost</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rms-border/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="h-5 w-24 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-40 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-16 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-24 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 animate-pulse rounded-md bg-rms-raised" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <WrenchIcon className="h-12 w-12 text-rms-text-secondary" />
                      <p className="text-rms-text-secondary">No repairs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((repair: Repair) => (
                  <tr key={repair.id} className="transition-colors hover:bg-rms-raised/30">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-semibold text-brand-500">{repair.ticket_number}</span>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={repair.status}
                        onChange={(e) => statusMutation.mutate({ id: repair.id, status: e.target.value })}
                        disabled={statusMutation.isPending}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20",
                          getStatusColor(repair.status)
                        )}
                      >
                        {(tab === "active" ? ACTIVE_STATUSES : COMPLETED_STATUSES).map((s) => (
                          <option key={s} value={s}>{getStatusLabel(s)}</option>
                        ))}
                        {tab === "active" && COMPLETED_STATUSES.map((s) => (
                          <option key={s} value={s}>{getStatusLabel(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-sm text-rms-text-secondary">
                      {repair.issue_description}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-rms-text-secondary">
                      {repair.labour_cost || repair.parts_cost
                        ? formatCurrency(Number(repair.labour_cost ?? 0) + Number(repair.parts_cost ?? 0))
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-rms-text-secondary">{formatDate(repair.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/repairs/${repair.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-rms-text-secondary transition-colors hover:bg-rms-raised hover:text-rms-text"
                          title="View repair details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => { if (confirm("Delete this repair?")) deleteMutation.mutate(repair.id); }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-rms-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400"
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
            <p className="text-sm text-rms-text-secondary">
              Page {currentPage + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => tab === "active" ? setActivePage((p) => Math.max(0, p - 1)) : setCompletedPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="flex items-center gap-1.5 rounded-lg border border-rms-border px-4 py-2 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => tab === "active" ? setActivePage((p) => Math.min(totalPages - 1, p + 1)) : setCompletedPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="flex items-center gap-1.5 rounded-lg border border-rms-border px-4 py-2 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised disabled:opacity-50 disabled:hover:bg-transparent"
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

