import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInvoices, markInvoicePaid, sendInvoice } from "../../api/invoices";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import type { Invoice, InvoiceStatus } from "../../types";
import { Plus, Filter, DollarSign, Send, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText as FileTextIcon } from "lucide-react";
import NewInvoiceModal from "../../components/admin/NewInvoiceModal";
import InvoiceDetailModal from "../../components/admin/InvoiceDetailModal";

const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue", "cancelled"];

export default function AdminInvoicesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invoices", page, statusFilter],
    queryFn: () => listInvoices(page * pageSize, pageSize, statusFilter || undefined),
  });

  const paidMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      markInvoicePaid(id, { paid_amount: amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-repairs"] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to mark invoice as paid: ${message || "Unknown error"}`);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-invoices"] }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-rms-text">Invoices</h1>
            <p className="mt-1 text-rms-text-secondary">{data?.total ?? 0} total invoices</p>
          </div>
          <button
            onClick={() => setShowNewInvoiceModal(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white transition-all duration-200 hover:bg-brand-600 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" /> New Invoice
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-rms-text0" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="rounded-lg border border-rms-border bg-rms-surface/80 px-4 py-2.5 text-rms-text transition-all focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {INVOICE_STATUSES.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-rms-border/50 bg-rms-surface/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-rms-border/50 bg-rms-surface/80 text-left text-sm font-medium text-rms-text-secondary">
                <th className="w-8 px-3 py-4"></th>
                <th className="px-5 py-4 font-medium">Invoice #</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Subtotal</th>
                <th className="px-5 py-4 font-medium">GST</th>
                <th className="px-5 py-4 font-medium">Total</th>
                <th className="px-5 py-4 font-medium">Due</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rms-border/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-4"><div className="h-5 w-4 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-24 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-16 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-16 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-16 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-24 animate-pulse rounded-md bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 animate-pulse rounded-md bg-rms-raised" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <FileTextIcon className="h-12 w-12 text-rms-text-secondary" />
                      <p className="text-rms-text-secondary">No invoices found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((invoice: Invoice) => {
                  const hasItems = invoice.items && invoice.items.length > 0;
                  const isExpanded = expandedId === invoice.id;
                  return (
                    <Fragment key={invoice.id}>
                      <tr className="transition-colors hover:bg-rms-raised/30">
                        <td className="px-3 py-4">
                          {hasItems && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                              className="rounded p-1 text-rms-text-secondary transition-colors hover:text-rms-text-secondary"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm font-semibold text-brand-500">{invoice.invoice_number}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getStatusColor(invoice.status))}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-rms-text-secondary">{formatCurrency(invoice.subtotal)}</td>
                        <td className="px-5 py-4 text-sm font-medium text-rms-text-secondary">{formatCurrency(invoice.gst_amount)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-brand-500">{formatCurrency(invoice.total_amount)}</td>
                        <td className="px-5 py-4 text-sm text-rms-text-secondary">{formatDate(invoice.due_date)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingInvoiceId(invoice.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-rms-text-secondary transition-colors hover:bg-rms-raised hover:text-rms-text"
                              title="View invoice"
                            >
                              <FileTextIcon className="h-4 w-4" />
                            </button>
                            {invoice.status === "draft" && (
                              <button
                                onClick={() => sendMutation.mutate(invoice.id)}
                                disabled={sendMutation.isPending}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-500/10 disabled:opacity-50"
                              >
                                <Send className="h-3.5 w-3.5" /> Send
                              </button>
                            )}
                            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                              <button
                                onClick={() => paidMutation.mutate({ id: invoice.id, amount: invoice.total_amount })}
                                disabled={paidMutation.isPending}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/10 disabled:opacity-50"
                              >
                                <DollarSign className="h-3.5 w-3.5" /> Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && hasItems && (
                        <tr>
                          <td colSpan={8} className="bg-rms-surface/30 px-5 py-3">
                            <p className="mb-2 text-xs font-medium text-rms-text-secondary">Line Items</p>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs text-rms-text0">
                                  <th className="pr-4 pb-1 font-medium">Description</th>
                                  <th className="pr-4 pb-1 font-medium">Type</th>
                                  <th className="pr-4 pb-1 font-medium text-right">Qty</th>
                                  <th className="pr-4 pb-1 font-medium text-right">Unit Price</th>
                                  <th className="pb-1 font-medium text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-rms-border/50">
                                {invoice.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="pr-4 py-1.5 text-rms-text">{item.description}</td>
                                    <td className="pr-4 py-1.5">
                                      <span className={cn(
                                        "rounded px-1.5 py-0.5 text-xs",
                                        item.item_type === "labour" && "bg-brand-500/10 text-brand-500",
                                        item.item_type === "parts" && "bg-amber-500/10 text-amber-400",
                                        item.item_type === "other" && "bg-rms-raised/50 text-rms-text-secondary",
                                      )}>
                                        {item.item_type}
                                      </span>
                                    </td>
                                    <td className="pr-4 py-1.5 text-right text-rms-text-secondary">{item.quantity}</td>
                                    <td className="pr-4 py-1.5 text-right text-rms-text-secondary">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-1.5 text-right font-medium text-rms-text">{formatCurrency(item.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
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
                className="flex items-center gap-1.5 rounded-lg border border-rms-border px-4 py-2 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1.5 rounded-lg border border-rms-border px-4 py-2 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised disabled:opacity-50 disabled:hover:bg-transparent"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <NewInvoiceModal open={showNewInvoiceModal} onClose={() => setShowNewInvoiceModal(false)} />
      <InvoiceDetailModal open={!!viewingInvoiceId} onClose={() => setViewingInvoiceId(null)} invoiceId={viewingInvoiceId} />
    </div>
  );
}

