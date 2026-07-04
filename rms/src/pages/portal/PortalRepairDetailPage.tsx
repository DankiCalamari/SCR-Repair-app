import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRepair, getRepairPhotos } from "../../api/repairs";
import { approveQuote, declineQuote } from "../../api/quotes";
import { downloadDocument } from "../../api/documents";
import { getPhotoCategoryCounts } from "../../api/photos";
import PhotoGallery from "../../components/photos/PhotoGallery";
import { getStatusLabel, getStatusColor, formatDate, formatDateTime, formatCurrency, cn } from "../../lib/utils";
import type { RepairDetail, Photo, PhotoCategoryCount } from "../../types";
import { Camera } from "lucide-react";
import {
  ArrowLeft, Smartphone, FileText, MessageSquare, Image,
  Download, CheckCircle2, XCircle, Clock, FileDown
} from "lucide-react";

function TimelineEntry({ entry, isLast }: { entry: { timestamp: string; status: string; notes: string | null }; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-copper-500 ring-4 ring-copper-500/20" />
        {!isLast && <div className="w-0.5 flex-1 bg-warm-200" />}
      </div>
      <div className="pb-6">
        <p className="text-sm font-medium text-warm-900">{getStatusLabel(entry.status)}</p>
        <p className="text-xs text-warm-500">{formatDateTime(entry.timestamp)}</p>
        {entry.notes && <p className="mt-1 text-sm text-warm-600">{entry.notes}</p>}
      </div>
    </div>
  );
}

export default function PortalRepairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "quotes" | "invoices" | "documents" | "communications" | "photos">("overview");
  const [signature, setSignature] = useState("");

  const { data: repair, isLoading } = useQuery<RepairDetail>({
    queryKey: ["repair", id],
    queryFn: () => getRepair(id!),
    enabled: !!id,
  });

  const { data: photos } = useQuery<Photo[]>({
    queryKey: ["portal-repair-photos", id],
    queryFn: () => getRepairPhotos(id!),
    enabled: !!id,
  });

  const { data: photoCategoryCounts } = useQuery<PhotoCategoryCount[]>({
    queryKey: ["portal-repair-photo-counts", id],
    queryFn: () => getPhotoCategoryCounts({ repairId: id }),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: ({ quoteId, digitalSignature }: { quoteId: string; digitalSignature: string }) =>
      approveQuote(quoteId, { action: "approve", digital_signature: digitalSignature }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair", id] }),
  });

  const declineMutation = useMutation({
    mutationFn: ({ quoteId, notes }: { quoteId: string; notes: string }) =>
      declineQuote(quoteId, { action: "decline", notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair", id] }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-copper-500 border-t-transparent" />
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-warm-900">Repair not found</h2>
          <Link to="/portal" className="mt-4 inline-block text-copper-500 hover:text-copper-600">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const quotes = repair.quotes || [];
  const invoices = repair.invoices || [];
  const documents = repair.documents || [];
  const timeline = repair.timeline || repair.status_history || [];
  const photoList = photos || repair.photos || [];

  const categoryCounts: Record<string, number> = {};
  if (photoCategoryCounts) {
    for (const c of photoCategoryCounts) {
      categoryCounts[c.category] = c.count;
    }
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: Smartphone },
    { key: "timeline", label: "Timeline", icon: Clock },
    { key: "quotes", label: "Quotes", icon: FileText },
    { key: "invoices", label: "Invoices", icon: FileDown },
    { key: "documents", label: "Documents", icon: Image },
    { key: "photos", label: `Photos${photoList.length ? ` (${photoList.length})` : ""}`, icon: Camera },
    { key: "communications", label: "Messages", icon: MessageSquare },
  ] as const;

  const handleDownloadDocument = async (docId: string, filename: string) => {
    const blob = await downloadDocument(docId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/portal" className="mb-4 inline-flex items-center gap-2 text-sm text-warm-500 hover:text-warm-900">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="font-heading text-3xl font-bold text-warm-900">{repair.ticket_number}</h1>
            <span className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", getStatusColor(repair.status))}>
              {getStatusLabel(repair.status)}
            </span>
          </div>
          <p className="mt-2 text-warm-500">Submitted {formatDate(repair.created_at)}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-warm-200 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition",
                activeTab === tab.key
                  ? "border-b-2 border-copper-500 text-copper-500"
                  : "text-warm-500 hover:text-warm-900"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-warm-200 bg-white p-6">
              <h3 className="mb-4 font-heading text-lg font-semibold text-warm-900">Device Information</h3>
              {repair.device ? (
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-warm-500">Type</span><span className="text-warm-900">{repair.device.device_type}</span></div>
                  <div className="flex justify-between"><span className="text-warm-500">Brand</span><span className="text-warm-900">{repair.device.brand}</span></div>
                  <div className="flex justify-between"><span className="text-warm-500">Model</span><span className="text-warm-900">{repair.device.model}</span></div>
                  <div className="flex justify-between"><span className="text-warm-500">Colour</span><span className="text-warm-900">{repair.device.colour || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-warm-500">IMEI</span><span className="text-warm-900">{repair.device.imei || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-warm-500">Serial</span><span className="text-warm-900">{repair.device.serial_number || "N/A"}</span></div>
                  {repair.device.accessories && <div className="flex justify-between"><span className="text-warm-500">Accessories</span><span className="text-warm-900">{repair.device.accessories}</span></div>}
                  {repair.device.existing_damage && <div className="flex justify-between"><span className="text-warm-500">Existing Damage</span><span className="text-warm-900">{repair.device.existing_damage}</span></div>}
                </div>
              ) : (
                <p className="text-warm-500">Device information loading...</p>
              )}
            </div>
            <div className="rounded-lg border border-warm-200 bg-white p-6">
              <h3 className="mb-4 font-heading text-lg font-semibold text-warm-900">Issue Details</h3>
              <p className="text-warm-600">{repair.issue_description}</p>
              {repair.diagnosis && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-warm-500">Diagnosis</h4>
                  <p className="mt-1 text-warm-600">{repair.diagnosis}</p>
                </div>
              )}
              {repair.repair_notes && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-warm-500">Repair Notes</h4>
                  <p className="mt-1 text-warm-600">{repair.repair_notes}</p>
                </div>
              )}
              {repair.estimated_completion && (
                <div className="mt-4 flex justify-between">
                  <span className="text-warm-500">Est. Completion</span>
                  <span className="text-warm-900">{repair.estimated_completion}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="rounded-lg border border-warm-200 bg-white p-6">
            <h3 className="mb-6 font-heading text-lg font-semibold text-warm-900">Repair Timeline</h3>
            {timeline.length === 0 ? (
              <p className="text-warm-500">No timeline entries yet.</p>
            ) : (
              <div className="ml-1">
                {timeline.map((entry, i) => (
                  <TimelineEntry key={i} entry={entry} isLast={i === timeline.length - 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "quotes" && (
          <div className="space-y-4">
            {quotes.length === 0 ? (
              <div className="rounded-lg border border-warm-200 bg-white p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-warm-400" />
                <h3 className="mt-4 text-lg font-semibold text-warm-900">No quotes yet</h3>
                <p className="mt-2 text-warm-500">Quotes will appear here once the technician has assessed your device.</p>
              </div>
            ) : (
              quotes.map((quote) => (
                <div key={quote.id} className="rounded-lg border border-warm-200 bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-heading text-lg font-semibold text-warm-900">{quote.quote_number}</p>
                      <p className="text-sm text-warm-500">Issued {formatDate(quote.created_at)}</p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getStatusColor(quote.status))}>
                      {getStatusLabel(quote.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div><p className="text-xs text-warm-500">Labour</p><p className="text-warm-900">{formatCurrency(quote.labour_cost)}</p></div>
                    <div><p className="text-xs text-warm-500">Parts</p><p className="text-warm-900">{formatCurrency(quote.parts_cost)}</p></div>
                    <div><p className="text-xs text-warm-500">GST</p><p className="text-warm-900">{formatCurrency(quote.gst_amount)}</p></div>
                    <div><p className="text-xs text-warm-500">Total</p><p className="font-semibold text-copper-500">{formatCurrency(quote.total_amount)}</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(quote.status === "sent" || quote.status === "draft") && (
                      <>
                        <div className="flex items-end gap-2">
                          <input
                            type="text"
                            placeholder="Type your name as signature"
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            className="rounded-lg border border-warm-300 bg-warm-100 px-3 py-2 text-sm text-warm-900 placeholder-warm-400 focus:border-copper-500 focus:outline-none"
                          />
                          <button
                            onClick={() => approveMutation.mutate({ quoteId: quote.id, digitalSignature: signature })}
                            disabled={approveMutation.isPending || !signature.trim()}
                            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </button>
                          <button
                            onClick={() => declineMutation.mutate({ quoteId: quote.id, notes: "Declined by customer" })}
                            disabled={declineMutation.isPending}
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                          >
                            <XCircle className="h-4 w-4" /> Decline
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="rounded-lg border border-warm-200 bg-white p-8 text-center">
                <FileDown className="mx-auto h-12 w-12 text-warm-400" />
                <h3 className="mt-4 text-lg font-semibold text-warm-900">No invoices yet</h3>
                <p className="mt-2 text-warm-500">Invoices will appear here once the repair is complete.</p>
              </div>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-lg border border-warm-200 bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-heading text-lg font-semibold text-warm-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-warm-500">Issued {formatDate(invoice.created_at)}</p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getStatusColor(invoice.status))}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div><p className="text-xs text-warm-500">Subtotal</p><p className="text-warm-900">{formatCurrency(invoice.subtotal)}</p></div>
                    <div><p className="text-xs text-warm-500">GST</p><p className="text-warm-900">{formatCurrency(invoice.gst_amount)}</p></div>
                    <div><p className="text-xs text-warm-500">Total</p><p className="font-semibold text-copper-500">{formatCurrency(invoice.total_amount)}</p></div>
                  </div>
                  {invoice.due_date && (
                    <p className="mt-3 text-sm text-warm-500">Due: {formatDate(invoice.due_date)}</p>
                  )}
                  {invoice.status === "paid" && (
                    <p className="mt-2 text-sm text-green-700">Paid on {formatDate(invoice.paid_date)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="rounded-lg border border-warm-200 bg-white p-8 text-center">
                <Image className="mx-auto h-12 w-12 text-warm-400" />
                <h3 className="mt-4 text-lg font-semibold text-warm-900">No documents yet</h3>
                <p className="mt-2 text-warm-500">Documents will appear here as your repair progresses.</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-warm-200 bg-white p-4">
                  <div>
                    <p className="font-medium text-warm-900">{doc.document_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                    <p className="text-sm text-warm-500">{formatDate(doc.created_at)}</p>
                  </div>
                  <button
                    onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                    className="flex items-center gap-2 rounded-lg border border-warm-300 px-4 py-2 text-sm text-warm-900 hover:bg-warm-100"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "photos" && (
          <div>
            {photoList.length === 0 ? (
              <div className="rounded-lg border border-warm-200 bg-white p-8 text-center">
                <Camera className="mx-auto h-12 w-12 text-warm-400" />
                <h3 className="mt-4 text-lg font-semibold text-warm-900">No photos yet</h3>
                <p className="mt-2 text-warm-500">Photos will appear here as your repair progresses.</p>
              </div>
            ) : (
              <PhotoGallery
                photos={photoList}
                readonly
                categoryCounts={categoryCounts}
              />
            )}
          </div>
        )}

        {activeTab === "communications" && (
          <div className="rounded-lg border border-warm-200 bg-white p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold text-warm-900">Communication History</h3>
            <p className="text-warm-500">SMS and email messages related to this repair will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

