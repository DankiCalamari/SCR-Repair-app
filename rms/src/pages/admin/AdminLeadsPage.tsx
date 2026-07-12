import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listLeads, updateLead, convertLead, deleteLead, createLead } from "../../api/leads";
import { getStatusLabel, getStatusColor, formatDate, cn } from "../../lib/utils";
import type { Lead, LeadStatus } from "../../types";
import { Plus, Search, UserPlus, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";

const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "converted", "closed"];

export default function AdminLeadsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadDeviceType, setNewLeadDeviceType] = useState("");
  const [newLeadDeviceModel, setNewLeadDeviceModel] = useState("");
  const [newLeadIssue, setNewLeadIssue] = useState("");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-leads", page, statusFilter, search],
    queryFn: () => listLeads(page * pageSize, pageSize, statusFilter || undefined),
  });

  const createMutation = useMutation({
    mutationFn: (leadData: { name: string; phone: string; email?: string; device_type?: string; device_model?: string; issue_description?: string }) => createLead(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      setShowNewLead(false);
      resetNewLeadForm();
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to create lead: ${message || "Unknown error"}`);
    },
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

  const resetNewLeadForm = () => {
    setNewLeadName("");
    setNewLeadPhone("");
    setNewLeadEmail("");
    setNewLeadDeviceType("");
    setNewLeadDeviceModel("");
    setNewLeadIssue("");
  };

  const handleCreateLead = () => {
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      alert("Name and phone are required");
      return;
    }
    createMutation.mutate({
      name: newLeadName,
      phone: newLeadPhone,
      email: newLeadEmail || undefined,
      device_type: newLeadDeviceType || undefined,
      device_model: newLeadDeviceModel || undefined,
      issue_description: newLeadIssue || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-rms-text">Leads</h1>
            <p className="mt-1 text-rms-text-secondary">{data?.total ?? 0} total leads</p>
          </div>
          <button
            onClick={() => setShowNewLead(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Lead
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rms-text-secondary" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); } }}
              className="w-full rounded-lg border border-rms-border bg-rms-raised py-2.5 pl-10 pr-4 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-rms-border bg-rms-raised px-3 py-2.5 text-rms-text focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{getStatusLabel(s)}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-rms-border bg-rms-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-rms-border text-left text-sm text-rms-text-secondary">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Device</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rms-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-rms-raised" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <UserPlus className="h-12 w-12 text-rms-text-secondary" />
                      <p className="text-rms-text-secondary">No leads found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((lead: Lead) => (
                  <tr key={lead.id} className="transition hover:bg-rms-raised">
                    <td className="px-5 py-4">
                      <span className="font-medium text-rms-text">{lead.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-rms-text-secondary">{lead.phone}</p>
                      {lead.email && <p className="text-xs text-rms-text0">{lead.email}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-rms-text-secondary">
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
                    <td className="px-5 py-4 text-sm text-rms-text-secondary">{lead.source || "—"}</td>
                    <td className="px-5 py-4 text-sm text-rms-text-secondary">{formatDate(lead.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {lead.status !== "converted" && lead.status !== "closed" && (
                          <button
                            onClick={() => convertMutation.mutate(lead.id)}
                            disabled={convertMutation.isPending}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-brand-500 hover:bg-brand-500/10"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Convert
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm("Delete this lead?")) deleteMutation.mutate(lead.id); }}
                          className="rounded p-1.5 text-rms-text-secondary hover:bg-rms-raised hover:text-red-400"
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
      </div>

      {/* New Lead Modal */}
      {showNewLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-rms-border bg-rms-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-rms-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-rms-text">New Lead</h2>
              <button onClick={() => setShowNewLead(false)} className="text-rms-text-secondary hover:text-rms-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Name *</label>
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Phone *</label>
                <input
                  type="tel"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Email</label>
                <input
                  type="email"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Device Type</label>
                  <select
                    value={newLeadDeviceType}
                    onChange={(e) => setNewLeadDeviceType(e.target.value)}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="iPhone">iPhone</option>
                    <option value="Android">Android</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Computer">Computer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Device Model</label>
                  <input
                    type="text"
                    value={newLeadDeviceModel}
                    onChange={(e) => setNewLeadDeviceModel(e.target.value)}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Issue Description</label>
                <textarea
                  value={newLeadIssue}
                  onChange={(e) => setNewLeadIssue(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNewLead(false)}
                  className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLead}
                  disabled={createMutation.isPending || !newLeadName.trim() || !newLeadPhone.trim()}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}