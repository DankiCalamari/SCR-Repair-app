import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoice, sendInvoice, uploadInvoicePdf } from "../../api/invoices";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import Modal from "../ui/Modal";
import { Loader2, Send, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  invoiceId: string | null;
}

export default function InvoiceDetailModal({ open, onClose, invoiceId }: Props) {
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice-detail", invoiceId],
    queryFn: () => getInvoice(invoiceId!),
    enabled: open && !!invoiceId,
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] }),
  });

  const uploadPdfMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadInvoicePdf(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] }),
  });

  return (
    <Modal open={open} onClose={onClose} title="Invoice Details" maxWidth="max-w-2xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
        </div>
      ) : invoice ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-mono text-xl font-bold text-surface-100">{invoice.invoice_number}</h3>
              <p className="mt-1 text-sm text-surface-400">Created {formatDate(invoice.created_at)}</p>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getStatusColor(invoice.status))}>
              {getStatusLabel(invoice.status)}
            </span>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-surface-700 bg-surface-750 p-4 text-sm">
            <div>
              <span className="text-surface-400">Repair ID</span>
              <p className="font-mono text-surface-100">{invoice.repair_id.slice(0, 8)}…</p>
            </div>
            {invoice.due_date && (
              <div>
                <span className="text-surface-400">Due Date</span>
                <p className="text-surface-100">{formatDate(invoice.due_date)}</p>
              </div>
            )}
            {invoice.paid_date && (
              <div>
                <span className="text-surface-400">Paid Date</span>
                <p className="text-surface-100">{formatDate(invoice.paid_date)}</p>
              </div>
            )}
            {invoice.paid_amount != null && (
              <div>
                <span className="text-surface-400">Paid Amount</span>
                <p className="text-surface-100">{formatCurrency(invoice.paid_amount)}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <p className="mb-1 text-xs font-medium text-surface-400">Notes</p>
              <p className="text-sm text-surface-100 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Line Items */}
          {invoice.items && invoice.items.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-surface-400">Line Items</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 text-left text-xs text-surface-500">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Unit Price</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-4 text-surface-100">{item.description}</td>
                      <td className="py-2 pr-4">
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-xs",
                          item.item_type === "labour" && "bg-accent-500/10 text-accent-500",
                          item.item_type === "parts" && "bg-amber-500/5 text-amber-400",
                          item.item_type === "other" && "bg-surface-600 text-surface-300",
                        )}>
                          {item.item_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right text-surface-300">{item.quantity}</td>
                      <td className="py-2 pr-4 text-right text-surface-300">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 text-right font-medium text-surface-100">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="rounded-lg border border-surface-700 bg-surface-750 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">Subtotal</span>
              <span className="text-surface-100">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">GST (10%)</span>
              <span className="text-surface-100">{formatCurrency(invoice.gst_amount)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-surface-600 pt-2">
              <span className="font-semibold text-surface-100">Total</span>
              <span className="text-lg font-bold text-accent-500">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <label
              className="flex items-center gap-2 rounded-lg border border-surface-600 px-4 py-2 text-sm font-medium text-surface-300 hover:bg-surface-700 cursor-pointer"
            >
              <Upload className="h-4 w-4" /> Upload PDF
              <input type="file" accept=".pdf" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && invoiceId) uploadPdfMutation.mutate({ id: invoiceId, file });
                  e.target.value = "";
                }}
              />
            </label>
            {invoice && (invoice.status === "draft" || invoice.status === "sent") && (
              <button
                onClick={() => sendMutation.mutate(invoice.id)}
                disabled={sendMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-surface-600 px-4 py-2 text-sm font-medium text-accent-500 hover:bg-surface-700"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="py-8 text-center text-surface-400">Invoice not found</p>
      )}
    </Modal>
  );
}
