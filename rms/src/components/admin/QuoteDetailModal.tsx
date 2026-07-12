import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQuote, sendQuote, uploadQuotePdf } from "../../api/quotes";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import Modal from "../ui/Modal";
import { Loader2, Send, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  quoteId: string | null;
}

export default function QuoteDetailModal({ open, onClose, quoteId }: Props) {
  const queryClient = useQueryClient();

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote-detail", quoteId],
    queryFn: () => getQuote(quoteId!),
    enabled: open && !!quoteId,
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendQuote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quote-detail", quoteId] }),
  });

  const uploadPdfMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadQuotePdf(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quote-detail", quoteId] }),
  });

  return (
    <Modal open={open} onClose={onClose} title="Quote Details" maxWidth="max-w-2xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : quote ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-mono text-xl font-bold text-rms-text">{quote.quote_number}</h3>
              <p className="mt-1 text-sm text-rms-text-secondary">Created {formatDate(quote.created_at)}</p>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getStatusColor(quote.status))}>
              {getStatusLabel(quote.status)}
            </span>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-rms-border bg-rms-raised p-4 text-sm">
            <div>
              <span className="text-rms-text-secondary">Repair ID</span>
              <p className="font-mono text-rms-text">{quote.repair_id.slice(0, 8)}…</p>
            </div>
            {quote.valid_until && (
              <div>
                <span className="text-rms-text-secondary">Valid Until</span>
                <p className="text-rms-text">{formatDate(quote.valid_until)}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {quote.description && (
            <div>
              <p className="mb-1 text-xs font-medium text-rms-text-secondary">Description</p>
              <p className="text-sm text-rms-text whitespace-pre-wrap">{quote.description}</p>
            </div>
          )}

          {/* Line Items */}
          {quote.items && quote.items.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-rms-text-secondary">Line Items</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rms-border text-left text-xs text-rms-text0">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Unit Price</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rms-border">
                  {quote.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-4 text-rms-text">{item.description}</td>
                      <td className="py-2 pr-4">
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-xs",
                          item.item_type === "labour" && "bg-brand-500/10 text-brand-500",
                          item.item_type === "parts" && "bg-amber-500/5 text-amber-400",
                          item.item_type === "other" && "bg-rms-border text-rms-text-secondary",
                        )}>
                          {item.item_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right text-rms-text-secondary">{item.quantity}</td>
                      <td className="py-2 pr-4 text-right text-rms-text-secondary">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 text-right font-medium text-rms-text">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="rounded-lg border border-rms-border bg-rms-raised p-4">
            <div className="flex justify-between text-sm">
              <span className="text-rms-text-secondary">Labour</span>
              <span className="text-rms-text">{formatCurrency(quote.labour_cost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-rms-text-secondary">Parts</span>
              <span className="text-rms-text">{formatCurrency(quote.parts_cost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-rms-text-secondary">GST (10%)</span>
              <span className="text-rms-text">{formatCurrency(quote.gst_amount)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-rms-border pt-2">
              <span className="font-semibold text-rms-text">Total</span>
              <span className="text-lg font-bold text-brand-500">{formatCurrency(quote.total_amount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <label
              className="flex items-center gap-2 rounded-lg border border-rms-border px-4 py-2 text-sm font-medium text-rms-text-secondary hover:bg-rms-border cursor-pointer"
            >
              <Upload className="h-4 w-4" /> Upload PDF
              <input type="file" accept=".pdf" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && quoteId) uploadPdfMutation.mutate({ id: quoteId, file });
                  e.target.value = "";
                }}
              />
            </label>
            {quote && (quote.status === "draft" || quote.status === "sent") && (
              <button
                onClick={() => sendMutation.mutate(quote.id)}
                disabled={sendMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-rms-border px-4 py-2 text-sm font-medium text-brand-500 hover:bg-rms-border"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="py-8 text-center text-rms-text-secondary">Quote not found</p>
      )}
    </Modal>
  );
}
