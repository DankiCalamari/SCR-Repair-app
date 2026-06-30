import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listQuotes, sendQuote, uploadQuotePdf } from "../../api/quotes";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import type { Quote, QuoteStatus } from "../../types";
import { Plus, Search, FileText, Send, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Upload } from "lucide-react";
import NewQuoteModal from "../../components/admin/NewQuoteModal";
import QuoteDetailModal from "../../components/admin/QuoteDetailModal";

const QUOTE_STATUSES: QuoteStatus[] = ["draft", "sent", "approved", "declined", "expired"];

export default function AdminQuotesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingQuoteId, setViewingQuoteId] = useState<string | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-quotes", page, statusFilter],
    queryFn: () => listQuotes(page * pageSize, pageSize, statusFilter || undefined),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendQuote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-quotes"] }),
  });

  const uploadPdfMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadQuotePdf(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-quotes"] }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-surface-100">Quotes</h1>
            <p className="mt-1 text-surface-400">{data?.total ?? 0} total quotes</p>
          </div>
          <button
            onClick={() => setShowNewQuoteModal(true)}
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 font-semibold text-surface-950 hover:bg-accent-400"
          >
            <Plus className="h-4 w-4" /> New Quote
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search quotes..."
              className="w-full rounded-lg border border-surface-700 bg-surface-800 py-2.5 pl-10 pr-4 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>{getStatusLabel(s)}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-surface-800 bg-surface-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800 text-left text-sm text-surface-400">
                <th className="w-8 px-3 py-3"></th>
                <th className="px-5 py-3 font-medium">Quote #</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Labour</th>
                <th className="px-5 py-3 font-medium">Parts</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-4"><div className="h-4 w-4 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-surface-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-surface-800" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-surface-400">No quotes found</td>
                </tr>
              ) : (
                data?.data?.map((quote: Quote) => {
                  const hasItems = quote.items && quote.items.length > 0;
                  const isExpanded = expandedId === quote.id;
                  return (
                    <Fragment key={quote.id}>
                      <tr className="transition hover:bg-surface-800">
                        <td className="px-3 py-4">
                          {hasItems && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                              className="rounded p-0.5 text-surface-400 hover:text-surface-100"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm font-medium text-accent-500">{quote.quote_number}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", getStatusColor(quote.status))}>
                            {getStatusLabel(quote.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-surface-100">{formatCurrency(quote.labour_cost)}</td>
                        <td className="px-5 py-4 text-sm text-surface-100">{formatCurrency(quote.parts_cost)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-accent-500">{formatCurrency(quote.total_amount)}</td>
                        <td className="px-5 py-4 text-sm text-surface-400">{formatDate(quote.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingQuoteId(quote.id)}
                              className="rounded p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-100"
                              title="View"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            {quote.status === "draft" && (
                              <button
                                onClick={() => sendMutation.mutate(quote.id)}
                                disabled={sendMutation.isPending}
                                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-accent-500 hover:bg-accent-500/10"
                              >
                                <Send className="h-3.5 w-3.5" /> Send
                              </button>
                            )}
                            <label
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-surface-300 hover:bg-surface-700 cursor-pointer"
                              title="Upload PDF"
                            >
                              <Upload className="h-3.5 w-3.5" /> Upload PDF
                              <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadPdfMutation.mutate({ id: quote.id, file });
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && hasItems && (
                        <tr>
                          <td colSpan={8} className="bg-surface-800 px-5 py-3">
                            <p className="mb-2 text-xs font-medium text-surface-400">Line Items</p>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs text-surface-500">
                                  <th className="pr-4 pb-1 font-medium">Description</th>
                                  <th className="pr-4 pb-1 font-medium">Type</th>
                                  <th className="pr-4 pb-1 font-medium text-right">Qty</th>
                                  <th className="pr-4 pb-1 font-medium text-right">Unit Price</th>
                                  <th className="pb-1 font-medium text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-800">
                                {quote.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="pr-4 py-1.5 text-surface-100">{item.description}</td>
                                    <td className="pr-4 py-1.5">
                                      <span className={cn(
                                        "rounded px-1.5 py-0.5 text-xs",
                                        item.item_type === "labour" && "bg-accent-500/10 text-accent-500",
                                        item.item_type === "parts" && "bg-amber-500/5 text-amber-400",
                                        item.item_type === "other" && "bg-surface-700 text-surface-300",
                                      )}>
                                        {item.item_type}
                                      </span>
                                    </td>
                                    <td className="pr-4 py-1.5 text-right text-surface-300">{item.quantity}</td>
                                    <td className="pr-4 py-1.5 text-right text-surface-300">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-1.5 text-right font-medium text-surface-100">{formatCurrency(item.total)}</td>
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
      <NewQuoteModal open={showNewQuoteModal} onClose={() => setShowNewQuoteModal(false)} />
      <QuoteDetailModal open={!!viewingQuoteId} onClose={() => setViewingQuoteId(null)} quoteId={viewingQuoteId} />
    </div>
  );
}
