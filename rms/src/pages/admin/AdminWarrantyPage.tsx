import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listWarranties, validateWarranty } from "../../api/warranty";
import { getStatusLabel, getStatusColor, formatDate, cn } from "../../lib/utils";
import type { WarrantyRecord, WarrantyStatus } from "../../types";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";

const WARRANTY_STATUSES: WarrantyStatus[] = ["active", "expired", "claimed", "void"];

export default function AdminWarrantyPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [validateInput, setValidateInput] = useState("");
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-warranties", page, statusFilter],
    queryFn: () => listWarranties(page * pageSize, pageSize, statusFilter || undefined),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleValidate = async () => {
    if (!validateInput.trim()) return;
    try {
      const result = await validateWarranty(validateInput.trim());
      setValidationResult({ valid: result.valid, message: result.message });
    } catch {
      setValidationResult({ valid: false, message: "Warranty not found" });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-surface-100">Warranties</h1>
          <p className="mt-1 text-surface-400">{data?.total ?? 0} total warranties</p>
        </div>

        {/* Validate Warranty */}
        <div className="mb-6 rounded-lg border border-surface-800 bg-surface-900 p-5">
          <h2 className="mb-4 font-heading text-lg font-semibold text-surface-100">Validate Warranty</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter warranty number..."
              value={validateInput}
              onChange={(e) => setValidateInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleValidate(); }}
              className="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
            />
            <button
              onClick={handleValidate}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 font-semibold text-surface-950 hover:bg-accent-400"
            >
              <Shield className="h-4 w-4" /> Validate
            </button>
          </div>
          {validationResult && (
            <div className={cn(
              "mt-3 rounded-lg border p-3 text-sm",
              validationResult.valid
                ? "border-green-500/20 bg-green-500/5 text-green-400"
                : "border-red-500/20 bg-red-500/5 text-red-400"
            )}>
              {validationResult.message}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {WARRANTY_STATUSES.map((s) => (
              <option key={s} value={s}>{getStatusLabel(s)}</option>
            ))}
          </select>
        </div>

        {/* Warranty List */}
        <div className="overflow-x-auto rounded-lg border border-surface-800 bg-surface-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800 text-left text-sm text-surface-400">
                <th className="px-5 py-3 font-medium">Warranty #</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Issue Date</th>
                <th className="px-5 py-3 font-medium">Expiry Date</th>
                <th className="px-5 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-surface-800" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-surface-400">No warranties found</td>
                </tr>
              ) : (
                data?.data?.map((warranty: WarrantyRecord) => (
                  <tr key={warranty.id} className="transition hover:bg-surface-800">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-medium text-accent-500">{warranty.warranty_number}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", getStatusColor(warranty.status))}>
                        {getStatusLabel(warranty.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-surface-300">{formatDate(warranty.issue_date)}</td>
                    <td className="px-5 py-4 text-sm text-surface-300">{formatDate(warranty.expiry_date)}</td>
                    <td className="max-w-xs truncate px-5 py-4 text-sm text-surface-400">{warranty.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-surface-400">Page {page + 1} of {totalPages}</p>
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
  );
}
