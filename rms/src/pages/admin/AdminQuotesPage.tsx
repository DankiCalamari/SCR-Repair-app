import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listQuotes, sendQuote, uploadQuotePdf } from "../../api/quotes";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import type { Quote, QuoteStatus } from "../../types";
import { Plus, Filter, FileText, Send, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Upload, FileText as FileTextIcon } from "lucide-react";
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
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-rms-text">Quotes</h1>
            <p className="text-xs text-rms-text-secondary">{data?.total ?? 0} total quotes</p>
          </div>
          <button
            onClick={() => setShowNewQuoteModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-rms-border bg-rms-surface px-3 py-1.5 text-xs font-medium text-rms-text-secondary hover:bg-rms-raised"
          >
            <Plus className="h-3.5 w-3.5" /> New Quote
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-rms-text-secondary" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="rounded-lg border border-rms-border bg-rms-surface px-2.5 py-1.5 text-xs text-rms-text focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-rms-border bg-rms-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-rms-border bg-rms-raised text-left text-[10px] font-medium uppercase text-rms-text-secondary">
                <th className="px-3 py-2"></th>
                <th className="px-4 py-2 font-medium">Quote #</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Labour</th>
                <th className="px-4 py-2 font-medium">Parts</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rms-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2"><div className="h-3 w-4 animate-pulse rounded bg-rms-border" /></td>
                    <td className="px-4 py-2"><div className="h-3 w-16 animate-pulse rounded bg-rms-border" /></td>
                    <td className="px-4 py-2"><div className="h-3 w-12 animate-pulse rounded bg-rms-border" /></td>
                    <td className="px-4 py-2"><div className="h-3 w-10 animate-pulse rounded bg-rms-border" /></td>
                    <td className="px-4 py-2"><div className="h-3 w-10 animate-pulse rounded bg-rms-border" /></td>
                    <td className="px-4 py-2"><div className="h-3 w-10 animate-pulse rounded bg-rms-border" /></td>
                    <td className="px-4 py-2"><div className="h-3 w-12 animate-pulse rounded bg-rms-border" /></td>
                    <td className="px-4 py-2"><div className="h-3 w-12 animate-pulse rounded bg-rms-border" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6">
                    <div className="flex flex-col items-center gap-2">
                      <FileTextIcon className="h-8 w-8 text-rms-text-secondary" />
                      <p className="text-xs text-rms-text-secondary">No quotes found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((quote: Quote) => {
                  const hasItems = quote.items && quote.items.length > 0;
                  const isExpanded = expandedId === quote.id;
                  return (
                    <Fragment key={quote.id}>
                      <tr className="transition-colors hover:bg-rms-raised">
                        <td className="px-3 py-2">
                          {hasItems && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                              className="rounded p-1 text-rms-text-secondary transition-colors hover:text-rms-text"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-mono text-[10px] font-semibold text-brand-500">{quote.quote_number}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", getStatusColor(quote.status))}>
                            {getStatusLabel(quote.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[10px] font-medium text-rms-text">{formatCurrency(quote.labour_cost)}</td>
                        <td className="px-4 py-2 text-[10px] font-medium text-rms-text">{formatCurrency(quote.parts_cost)}</td>
                        <td className="px-4 py-2 text-[10px] font-semibold text-brand-500">{formatCurrency(quote.total_amount)}</td>
                        <td className="px-4 py-2 text-[10px] text-rms-text-secondary">{formatDate(quote.created_at)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingQuoteId(quote.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg text-rms-text-secondary hover:bg-rms-border"
                              title="View quote"
                            >
                              <FileText className="h-3 w-3" />
                            </button>
                            {quote.status === "draft" && (
                              <button
                                onClick={() => sendMutation.mutate(quote.id)}
                                disabled={sendMutation.isPending}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-brand-500 hover:bg-brand-500/10 disabled:opacity-50"
                              >
                                <Send className="h-2.5 w-2.5" /> Send
                              </button>
                            )}
                            <label
                              className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-rms-text-secondary hover:bg-rms-border"
                              title="Upload PDF"
                            >
                              <Upload className="h-2.5 w-2.5" /> PDF
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
                          <td colSpan={8} className="bg-rms-bg px-4 py-2">
                            <p className="mb-1 text-[10px] font-medium text-rms-text-secondary">Line Items</p>
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr className="text-left text-[10px] text-rms-text-secondary">
                                  <th className="pr-2 pb-0.5 font-medium">Desc</th>
                                  <th className="pr-2 pb-0.5 font-medium">Type</th>
                                  <th className="pr-2 pb-0.5 font-medium text-right">Qty</th>
                                  <th className="pr-2 pb-0.5 font-medium text-right">Price</th>
                                  <th className="pb-0.5 font-medium text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-rms-border">
                                {quote.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="pr-2 py-1 text-[10px] text-rms-text">{item.description}</td>
                                    <td className="pr-2 py-1">
                                      <span className={cn(
                                        "rounded px-1 py-0 text-[10px]",
                                        item.item_type === "labour" && "bg-brand-500/10 text-brand-500",
                                        item.item_type === "parts" && "bg-amber-500/10 text-amber-400",
                                        item.item_type === "other" && "bg-rms-border text-rms-text-secondary",
                                      )}>
                                        {item.item_type}
                                      </span>
                                    </td>
                                    <td className="pr-2 py-1 text-right text-[10px] text-rms-text-secondary">{item.quantity}</td>
                                    <td className="pr-2 py-1 text-right text-[10px] text-rms-text-secondary">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-1 text-right font-medium text-[10px] text-rms-text">{formatCurrency(item.total)}</td>
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
      <NewQuoteModal open={showNewQuoteModal} onClose={() => setShowNewQuoteModal(false)} />
      <QuoteDetailModal open={!!viewingQuoteId} onClose={() => setViewingQuoteId(null)} quoteId={viewingQuoteId} />
    </div>
  );
}

