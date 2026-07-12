import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCustomers, deleteCustomer } from "../../api/customers";
import { formatDate } from "../../lib/utils";
import type { Customer } from "../../types";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import NewCustomerModal from "../../components/admin/NewCustomerModal";

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", page, search],
    queryFn: () => listCustomers(page * pageSize, pageSize, search || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-customers"] }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-rms-text md:text-2xl">Customers</h1>
            <p className="text-xs text-rms-text-secondary">{data?.total ?? 0} total</p>
          </div>
          <button
            onClick={() => setShowNewCustomer(true)}
            className="flex items-center gap-1.5 rounded-lg border border-rms-border bg-rms-surface px-3 py-1.5 text-xs font-medium text-rms-text-secondary hover:bg-rms-raised"
          >
            <Plus className="h-3.5 w-3.5" /> Add Customer
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rms-text-secondary" />
            <input
              type="text"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); } }}
              className="w-full rounded-lg border border-rms-border bg-rms-surface py-1.5 pl-9 pr-3 text-xs text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-rms-border bg-rms-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-rms-border text-left text-[10px] font-medium uppercase text-rms-text-secondary">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rms-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-3 w-28 rounded bg-rms-raised" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-32 rounded bg-rms-raised" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-24 rounded bg-rms-raised" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 rounded bg-rms-raised" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-12 rounded bg-rms-raised" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-rms-text-secondary">
                    No customers found
                  </td>
                </tr>
              ) : (
                data?.data?.map((customer: Customer) => (
                  <tr key={customer.id} className="transition hover:bg-rms-raised">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-bold text-brand-500">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-rms-text">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-rms-text-secondary">{customer.email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-rms-text-secondary">{customer.phone}</td>
                    <td className="px-4 py-3 text-xs text-rms-text-secondary">{formatDate(customer.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/admin/customers/${customer.id}`}
                          className="rounded p-1 text-rms-text-secondary hover:bg-rms-border"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => { if (confirm("Delete this customer?")) deleteMutation.mutate(customer.id); }}
                          className="rounded p-1 text-rms-text-secondary hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-rms-text-secondary">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-lg border border-rms-border px-2.5 py-1 text-xs text-rms-text-secondary hover:bg-rms-raised disabled:opacity-50"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-lg border border-rms-border px-2.5 py-1 text-xs text-rms-text-secondary hover:bg-rms-raised disabled:opacity-50"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
      <NewCustomerModal open={showNewCustomer} onClose={() => setShowNewCustomer(false)} />
    </div>
  );
}
