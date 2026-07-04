import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listLeads, updateLead, convertLead, deleteLead } from "../../api/leads";
import { getStatusLabel, getStatusColor, formatDate, cn } from "../../lib/utils";
import type { Lead, LeadStatus } from "../../types";
import { Plus, Search, UserPlus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "converted", "closed"];

export default function AdminLeadsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-leads", page, statusFilter, search],
    queryFn: () => listLeads(page * pageSize, pageSize, statusFilter || undefined),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateLead(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-leads"] }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => convertLead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-leads"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-leads"] }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-warm-50">Leads</h1>
            <p className="mt-1 text-warm-400">{data?.total ?? 0} total leads</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2.5 font-semibold text-warm-950 hover:bg-copper-600">
            <Plus className="h-4 w-4" /> New Lead
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); } }}
              className="w-full rounded-lg border border-warm-700 bg-warm-800 py-2.5 pl-10 pr-4 text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-warm-700 bg-warm-800 px-3 py-2.5 text-warm-50 focus:border-copper-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{getStatusLabel(s)}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-warm-800 bg-warm-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-warm-800 text-left text-sm text-warm-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Device</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-warm-800" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-warm-400">No leads found</td>
                </tr>
              ) : (
                data?.data?.map((lead: Lead) => (
                  <tr key={lead.id} className="transition hover:bg-warm-800">
                    <td className="px-5 py-4">
                      <span className="font-medium text-warm-50">{lead.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-warm-300">{lead.phone}</p>
                      {lead.email && <p className="text-xs text-warm-500">{lead.email}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-warm-300">
                      {lead.device_type ? `${lead.device_type} ${lead.device_model || ""}`.trim() : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) => statusMutation.mutate({ id: lead.id, status: e.target.value })}
                        disabled={statusMutation.isPending}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium focus:outline-none",
                          getStatusColor(lead.status)
                        )}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>{getStatusLabel(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-sm text-warm-400">{lead.source || "—"}</td>
                    <td className="px-5 py-4 text-sm text-warm-400">{formatDate(lead.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {lead.status !== "converted" && lead.status !== "closed" && (
                          <button
                            onClick={() => convertMutation.mutate(lead.id)}
                            disabled={convertMutation.isPending}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-copper-500 hover:bg-copper-500/10"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Convert
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm("Delete this lead?")) deleteMutation.mutate(lead.id); }}
                          className="rounded p-1.5 text-warm-400 hover:bg-warm-800 hover:text-red-400"
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

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-warm-400">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-lg border border-warm-700 px-3 py-2 text-sm text-warm-50 hover:bg-warm-800 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-lg border border-warm-700 px-3 py-2 text-sm text-warm-50 hover:bg-warm-800 disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

