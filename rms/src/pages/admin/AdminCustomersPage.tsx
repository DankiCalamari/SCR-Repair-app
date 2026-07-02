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
    <>
    <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-warm-100">Customers</h1>
            <p className="mt-1 text-warm-400">{data?.total ?? 0} total customers</p>
          </div>
          <button
            onClick={() => setShowNewCustomer(true)}
            className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2.5 font-semibold text-warm-950 hover:bg-copper-600"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); } }}
              className="w-full rounded-lg border border-warm-700 bg-warm-900 py-2.5 pl-10 pr-4 text-warm-100 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-warm-700 bg-warm-950">
          <table className="w-full">
            <thead>
              <tr className="border-b border-warm-700 text-left text-sm text-warm-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-40 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-warm-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-warm-800" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-warm-400">
                    No customers found
                  </td>
                </tr>
              ) : (
                data?.data?.map((customer: Customer) => (
                  <tr key={customer.id} className="transition hover:bg-warm-800">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-copper-500/10 text-sm font-bold text-copper-500">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-warm-100">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-warm-300">{customer.email || "—"}</td>
                    <td className="px-5 py-4 text-sm text-warm-300">{customer.phone}</td>
                    <td className="px-5 py-4 text-sm text-warm-400">{formatDate(customer.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/customers/${customer.id}`}
                          className="rounded p-1.5 text-warm-400 hover:bg-warm-800 hover:text-warm-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => { if (confirm("Delete this customer?")) deleteMutation.mutate(customer.id); }}
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
      <NewCustomerModal open={showNewCustomer} onClose={() => setShowNewCustomer(false)} />
    </>
  );
}