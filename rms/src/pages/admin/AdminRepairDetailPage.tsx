import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRepair, updateRepairStatus, getRepairTimeline, getRepairPhotos, getRepairDocuments } from "../../api/repairs";
import { createQuote, sendQuote, approveQuote, declineQuote, uploadQuotePdf } from "../../api/quotes";
import { createInvoice, sendInvoice, markInvoicePaid, uploadInvoicePdf } from "../../api/invoices";
import { downloadDocument, uploadDocument } from "../../api/documents";
import { sendSms, listSmsMessages, getSmsTemplates, sendSmsTemplate } from "../../api/sms";
import { sendEmailTemplate, getEmailTemplates, listEmails } from "../../api/email";
import { getPhotoCategoryCounts, deletePhoto } from "../../api/photos";
import PhotoGallery from "../../components/photos/PhotoGallery";
import PhotoUploader from "../../components/photos/PhotoUploader";
import { getStatusLabel, getStatusColor, formatDate, formatDateTime, formatCurrency, cn } from "../../lib/utils";
import type { RepairDetail, RepairStatus, Quote, Invoice, PhotoCategoryCount } from "../../types";
import {
  ArrowLeft, Smartphone, FileText, Image,
  Download, Clock, FileDown, Camera, MessageSquare, Send, ChevronDown,
  Plus, Check, X, DollarSign, Upload,
} from "lucide-react";

const ALL_STATUSES: RepairStatus[] = [
  "lead", "device_received", "diagnosing", "waiting_for_customer",
  "waiting_for_parts", "in_progress", "repaired", "ready_for_collection",
  "completed", "cancelled",
];

// ─── Inline Create Quote Modal ───────────────────────────────────────────────
function CreateQuoteModal({ repairId, customerName, onClose, onSuccess }: {
  repairId: string; customerName: string; onClose: () => void; onSuccess: () => void;
}) {
  const [items, setItems] = useState<{ description: string; quantity: number; unit_price: number; item_type: "labour" | "parts" | "other" }[]>([{ description: "", quantity: 1, unit_price: 0, item_type: "labour" }]);
  const [description, setDescription] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const mutation = useMutation({
    mutationFn: createQuote,
    onSuccess,
  });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const gst = subtotal * 0.10;
  const total = subtotal + gst;

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0, item_type: "parts" }]);
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const updateItem = (idx: number, field: string, value: string | number) => {
    const updated = [...items];
    if (field === "item_type") updated[idx] = { ...updated[idx], item_type: value as "labour" | "parts" | "other" };
    else updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20">
      <div className="w-full max-w-lg rounded-lg border border-warm-700 bg-warm-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-warm-700 px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-warm-50">New Quote</h2>
          <button onClick={onClose} className="rounded p-1 text-warm-400 hover:bg-warm-700 hover:text-warm-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-warm-400">Customer: <span className="text-warm-50">{customerName}</span></p>
          <div>
            <label className="mb-2 block text-xs font-medium text-warm-400">Line Items</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <input type="text" placeholder="Description" value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    className="flex-1 rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none" />
                  <select value={item.item_type} onChange={(e) => updateItem(idx, "item_type", e.target.value)}
                    className="w-20 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-xs text-warm-50 focus:border-copper-500 focus:outline-none">
                    <option value="labour">Labour</option>
                    <option value="parts">Parts</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="number" min="1" placeholder="Qty" value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="w-14 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none" />
                  <input type="number" min="0" step="0.01" placeholder="Price" value={item.unit_price || ""}
                    onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none" />
                  <button onClick={() => removeItem(idx)} disabled={items.length <= 1}
                    className="mt-1 rounded p-1 text-warm-500 hover:text-red-400 disabled:opacity-30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 text-xs text-copper-500 hover:text-copper-600">+ Add Line Item</button>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-warm-400">Description / Notes</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Quote description..."
              className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-warm-400">Valid Until</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none" />
          </div>
          <div className="rounded-lg border border-warm-600 bg-warm-700 p-3">
            <div className="flex justify-between text-sm"><span className="text-warm-400">Subtotal</span><span className="text-warm-50">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-warm-400">GST (10%)</span><span className="text-warm-50">${gst.toFixed(2)}</span></div>
            <div className="mt-1 flex justify-between border-t border-warm-600 pt-1"><span className="font-medium text-warm-300">Total</span><span className="font-semibold text-copper-500">${total.toFixed(2)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg border border-warm-600 py-2.5 text-sm font-medium text-warm-300 hover:bg-warm-700">Cancel</button>
            <button onClick={() => mutation.mutate({
              repair_id: repairId, description: description || null, valid_until: validUntil || null,
              items: items.filter(i => i.description.trim()).map((item, idx) => ({
                description: item.description, quantity: item.quantity, unit_price: item.unit_price,
                total: parseFloat((item.quantity * item.unit_price).toFixed(2)), item_type: item.item_type, sort_order: idx,
              })),
            })} disabled={mutation.isPending || !items.some(i => i.description.trim())}
              className="flex-1 rounded-lg bg-copper-500 py-2.5 text-sm font-semibold text-warm-50 hover:bg-copper-600 disabled:opacity-50">
              {mutation.isPending ? "Creating..." : "Create Quote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Create Invoice Modal ─────────────────────────────────────────────
function CreateInvoiceModal({ repairId, customerName, onClose, onSuccess }: {
  repairId: string; customerName: string; onClose: () => void; onSuccess: () => void;
}) {
  const [items, setItems] = useState<{ description: string; quantity: number; unit_price: number; item_type: "labour" | "parts" | "other" }[]>([{ description: "", quantity: 1, unit_price: 0, item_type: "labour" }]);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess,
  });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const gst = subtotal * 0.10;
  const total = subtotal + gst;

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0, item_type: "parts" as const }]);
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const updateItem = (idx: number, field: string, value: string | number) => {
    const updated = [...items];
    if (field === "item_type") updated[idx] = { ...updated[idx], item_type: value as "labour" | "parts" | "other" };
    else updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20">
      <div className="w-full max-w-lg rounded-lg border border-warm-700 bg-warm-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-warm-700 px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-warm-50">New Invoice</h2>
          <button onClick={onClose} className="rounded p-1 text-warm-400 hover:bg-warm-700 hover:text-warm-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-warm-400">Customer: <span className="text-warm-50">{customerName}</span></p>
          <div>
            <label className="mb-2 block text-xs font-medium text-warm-400">Line Items</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <input type="text" placeholder="Description" value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    className="flex-1 rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none" />
                  <select value={item.item_type} onChange={(e) => updateItem(idx, "item_type", e.target.value)}
                    className="w-20 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-xs text-warm-50 focus:border-copper-500 focus:outline-none">
                    <option value="labour">Labour</option>
                    <option value="parts">Parts</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="number" min="1" placeholder="Qty" value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="w-14 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none" />
                  <input type="number" min="0" step="0.01" placeholder="Price" value={item.unit_price || ""}
                    onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none" />
                  <button onClick={() => removeItem(idx)} disabled={items.length <= 1}
                    className="mt-1 rounded p-1 text-warm-500 hover:text-red-400 disabled:opacity-30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 text-xs text-copper-500 hover:text-copper-600">+ Add Line Item</button>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-warm-400">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-warm-400">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none" />
          </div>
          <div className="rounded-lg border border-warm-600 bg-warm-700 p-3">
            <div className="flex justify-between text-sm"><span className="text-warm-400">Subtotal</span><span className="text-warm-50">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-warm-400">GST (10%)</span><span className="text-warm-50">${gst.toFixed(2)}</span></div>
            <div className="mt-1 flex justify-between border-t border-warm-600 pt-1"><span className="font-medium text-warm-300">Total</span><span className="font-semibold text-copper-500">${total.toFixed(2)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg border border-warm-600 py-2.5 text-sm font-medium text-warm-300 hover:bg-warm-700">Cancel</button>
            <button onClick={() => mutation.mutate({
              repair_id: repairId, subtotal: parseFloat(subtotal.toFixed(2)), notes: notes || null, due_date: dueDate || null,
              items: items.filter(i => i.description.trim()).map((item, idx) => ({
                description: item.description, quantity: item.quantity, unit_price: item.unit_price,
                total: parseFloat((item.quantity * item.unit_price).toFixed(2)), item_type: item.item_type, sort_order: idx,
              })),
            })} disabled={mutation.isPending || !items.some(i => i.description.trim())}
              className="flex-1 rounded-lg bg-copper-500 py-2.5 text-sm font-semibold text-warm-50 hover:bg-copper-600 disabled:opacity-50">
              {mutation.isPending ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminRepairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "communication" | "quotes" | "invoices" | "documents" | "photos">("overview");
  const [smsBody, setSmsBody] = useState("");
  const [simNumber, setSimNumber] = useState<number>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);

  const { data: repair, isLoading } = useQuery<RepairDetail>({
    queryKey: ["admin-repair", id],
    queryFn: () => getRepair(id!),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ["admin-repair-timeline", id],
    queryFn: () => getRepairTimeline(id!),
    enabled: !!id,
  });

  const { data: smsMessages } = useQuery({
    queryKey: ["admin-repair-sms", id],
    queryFn: () => listSmsMessages(0, 50, id),
    enabled: !!id && activeTab === "communication",
    refetchInterval: 30000,
  });

  const { data: templates } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: getSmsTemplates,
    enabled: activeTab === "communication",
  });

  const { data: emailTemplates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
  });

  const { data: emailMessages } = useQuery({
    queryKey: ["admin-repair-email", id],
    queryFn: () => listEmails(0, 50, id),
    enabled: !!id && activeTab === "communication",
    refetchInterval: 30000,
  });

  const { data: photos } = useQuery({
    queryKey: ["admin-repair-photos", id],
    queryFn: () => getRepairPhotos(id!),
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["admin-repair-documents", id],
    queryFn: () => getRepairDocuments(id!),
    enabled: !!id,
  });

  const invalidateRepair = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-repair", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-repair-timeline", id] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      updateRepairStatus(id!, { status, notes }),
    onSuccess: invalidateRepair,
  });

  const smsMutation = useMutation({
    mutationFn: () => sendSms({
      to_number: repair?.customer?.phone || "",
      body: smsBody,
      repair_id: id,
      customer_id: repair?.customer?.id,
      sim_number: simNumber
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      invalidateRepair();
      setSmsBody("");
    },
  });

  const templateSmsMutation = useMutation({
    mutationFn: (templateId: string) => sendSmsTemplate({ template_id: templateId, repair_id: id, sim_number: simNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      invalidateRepair();
      setSelectedTemplateId("");
    },
  });

  // Quote mutations
  const sendQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => sendQuote(quoteId),
    onSuccess: invalidateRepair,
  });

  const approveQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => approveQuote(quoteId, { action: "approve" }),
    onSuccess: invalidateRepair,
  });

  const declineQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => declineQuote(quoteId, { action: "decline" }),
    onSuccess: invalidateRepair,
  });

  const sendQuoteEmailMutation = useMutation({
    mutationFn: (data: { templateId: string; quote: Quote }) => sendEmailTemplate({
      template_id: data.templateId,
      repair_id: id!,
      customer_id: repair?.customer?.id || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
    },
  });

  const uploadQuotePdfMutation = useMutation({
    mutationFn: ({ quoteId, file }: { quoteId: string; file: File }) => uploadQuotePdf(quoteId, file),
    onSuccess: invalidateRepair,
  });

  const uploadInvoicePdfMutation = useMutation({
    mutationFn: ({ invoiceId, file }: { invoiceId: string; file: File }) => uploadInvoicePdf(invoiceId, file),
    onSuccess: invalidateRepair,
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: ({ repairId: rid, docType, file }: { repairId: string; docType: string; file: File }) =>
      uploadDocument(rid, docType, file),
    onSuccess: invalidateRepair,
  });

  // Invoice mutations
  const sendInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => sendInvoice(invoiceId),
    onSuccess: invalidateRepair,
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ invoiceId, amount }: { invoiceId: string; amount: number }) =>
      markInvoicePaid(invoiceId, { paid_amount: amount }),
    onSuccess: () => {
      invalidateRepair();
      alert("Invoice marked as paid");
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to mark invoice as paid: ${message || "Unknown error"}`);
    },
  });

  const sendInvoiceEmailMutation = useMutation({
    mutationFn: (data: { templateId: string; invoice: Invoice }) => sendEmailTemplate({
      template_id: data.templateId,
      repair_id: id!,
      customer_id: repair?.customer?.id || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
    },
  });

  const { data: photoCategoryCounts } = useQuery<PhotoCategoryCount[]>({
    queryKey: ["admin-repair-photo-counts", id],
    queryFn: () => getPhotoCategoryCounts({ repairId: id }),
    enabled: !!id,
  });

  const photoDeleteMutation = useMutation({
    mutationFn: (photoId: string) => deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repair-photos", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-repair-photo-counts", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-repair", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-copper-500 border-t-transparent" />
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-warm-50">Repair not found</h2>
          <Link to="/admin/repairs" className="mt-4 inline-block text-copper-500 hover:text-copper-600">Back to Repairs</Link>
        </div>
      </div>
    );
  }

  const quotes = repair.quotes || [];
  const invoices = repair.invoices || [];
  const docs = documents || repair.documents || [];
  const photoList = photos || repair.photos || [];
  const timelineEntries = timeline || [];
  const customerEmail = repair.customer?.email;

  const categoryCounts: Record<string, number> = {};
  if (photoCategoryCounts) {
    for (const c of photoCategoryCounts) {
      categoryCounts[c.category] = c.count;
    }
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: Smartphone },
    { key: "timeline", label: "Timeline", icon: Clock },
    { key: "communication", label: "SMS", icon: MessageSquare },
    { key: "quotes", label: `Quotes${quotes.length ? ` (${quotes.length})` : ""}`, icon: FileText },
    { key: "invoices", label: `Invoices${invoices.length ? ` (${invoices.length})` : ""}`, icon: FileDown },
    { key: "documents", label: `Documents${docs.length ? ` (${docs.length})` : ""}`, icon: Image },
    { key: "photos", label: `Photos${photoList.length ? ` (${photoList.length})` : ""}`, icon: Camera },
  ] as const;

  const handleDownloadDocument = async (docId: string, filename: string) => {
    const blob = await downloadDocument(docId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/repairs" className="mb-4 inline-flex items-center gap-2 text-sm text-warm-400 hover:text-warm-50">
          <ArrowLeft className="h-4 w-4" /> Back to Repairs
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-heading text-3xl font-bold text-warm-50">{repair.ticket_number}</h1>
          <select value={repair.status} onChange={(e) => statusMutation.mutate({ status: e.target.value })}
            disabled={statusMutation.isPending}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-medium focus:outline-none", getStatusColor(repair.status))}>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
          </select>
        </div>
        <p className="mt-2 text-warm-400">Submitted {formatDate(repair.created_at)}</p>
      </div>

      {/* Customer info bar */}
      {repair.customer && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-warm-700 bg-warm-800 px-5 py-3">
          <div><p className="text-xs text-warm-400">Customer</p><p className="font-medium text-warm-50">{repair.customer.name}</p></div>
          <div><p className="text-xs text-warm-400">Email</p><p className="text-warm-300">{repair.customer.email || "—"}</p></div>
          <div><p className="text-xs text-warm-400">Phone</p><p className="text-warm-300">{repair.customer.phone}</p></div>
          <Link to={`/admin/customers/${repair.customer.id}`} className="ml-auto text-sm text-copper-500 hover:text-copper-600">View Customer →</Link>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-warm-700 pb-px">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition",
              activeTab === tab.key ? "border-b-2 border-copper-500 text-copper-500" : "text-warm-400 hover:text-warm-50")}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-warm-700 bg-warm-800 p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold text-warm-50">Device Information</h3>
            {repair.device ? (
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-warm-400">Type</span><span className="text-warm-50">{repair.device.device_type}</span></div>
                <div className="flex justify-between"><span className="text-warm-400">Brand</span><span className="text-warm-50">{repair.device.brand}</span></div>
                <div className="flex justify-between"><span className="text-warm-400">Model</span><span className="text-warm-50">{repair.device.model}</span></div>
                <div className="flex justify-between"><span className="text-warm-400">Colour</span><span className="text-warm-50">{repair.device.colour || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-warm-400">IMEI</span><span className="text-warm-50">{repair.device.imei || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-warm-400">Serial</span><span className="text-warm-50">{repair.device.serial_number || "N/A"}</span></div>
                {repair.device.accessories && <div className="flex justify-between"><span className="text-warm-400">Accessories</span><span className="text-warm-50">{repair.device.accessories}</span></div>}
                {repair.device.existing_damage && <div className="flex justify-between"><span className="text-warm-400">Existing Damage</span><span className="text-warm-50">{repair.device.existing_damage}</span></div>}
              </div>
            ) : (<p className="text-warm-400">No device linked.</p>)}
          </div>
          <div className="rounded-lg border border-warm-700 bg-warm-800 p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold text-warm-50">Issue Details</h3>
            <p className="text-warm-300">{repair.issue_description}</p>
            {repair.diagnosis && <div className="mt-4"><h4 className="text-sm font-medium text-warm-400">Diagnosis</h4><p className="mt-1 text-warm-300">{repair.diagnosis}</p></div>}
            {repair.repair_notes && <div className="mt-4"><h4 className="text-sm font-medium text-warm-400">Repair Notes</h4><p className="mt-1 text-warm-300">{repair.repair_notes}</p></div>}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {repair.labour_cost && <div><p className="text-xs text-warm-400">Labour</p><p className="text-warm-50">{formatCurrency(Number(repair.labour_cost))}</p></div>}
              {repair.parts_cost && <div><p className="text-xs text-warm-400">Parts</p><p className="text-warm-50">{formatCurrency(Number(repair.parts_cost))}</p></div>}
              {repair.estimated_completion && <div><p className="text-xs text-warm-400">Est. Completion</p><p className="text-warm-50">{repair.estimated_completion}</p></div>}
              {repair.completed_date && <div><p className="text-xs text-warm-400">Completed</p><p className="text-warm-50">{formatDate(repair.completed_date)}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div className="rounded-lg border border-warm-700 bg-warm-800 p-6">
          <h3 className="mb-6 font-heading text-lg font-semibold text-warm-50">Repair Timeline</h3>
          {timelineEntries.length === 0 ? (
            <p className="text-warm-400">No timeline entries yet.</p>
          ) : (
            <div className="ml-1 space-y-0">
              {timelineEntries.map((entry: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn("h-3 w-3 rounded-full ring-4", entry.type === "sms" ? "bg-warm-400 ring-warm-400/20" : "bg-copper-500 ring-copper-500/20")} />
                    {i < timelineEntries.length - 1 && <div className="w-0.5 flex-1 bg-warm-700" />}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-warm-50">
                      {entry.type === "sms" ? (entry.direction === "outbound" ? "SMS Sent" : "SMS Received") : getStatusLabel(entry.status || entry.to_status)}
                    </p>
                    <p className="text-xs text-warm-400">{formatDateTime(entry.timestamp || entry.created_at)}</p>
                    {entry.body && <p className="mt-1 text-sm text-warm-300 italic">"{entry.body}"</p>}
                    {entry.notes && <p className="mt-1 text-sm text-warm-300">{entry.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Communication Tab */}
      {activeTab === "communication" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-lg border border-warm-700 bg-warm-800 p-5">
              <h3 className="mb-4 font-heading text-lg font-semibold text-warm-50">Send Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-warm-400">Select Template</label>
                  <div className="relative">
                    <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-warm-600 bg-warm-700 px-4 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none">
                      <option value="">Choose a template...</option>
                      {templates?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-warm-400" />
                  </div>
                </div>
                <button onClick={() => templateSmsMutation.mutate(selectedTemplateId)}
                  disabled={templateSmsMutation.isPending || !selectedTemplateId}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-copper-500 py-2.5 font-bold text-warm-50 transition hover:bg-copper-600 disabled:opacity-50">
                  <Send className="h-4 w-4" /> Send Template
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-warm-700 bg-warm-800 p-5">
              <h3 className="mb-4 font-heading text-lg font-semibold text-warm-50">Custom Message</h3>
              <div className="space-y-4">
                <textarea placeholder="Type your message..." value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={4}
                  className="w-full rounded-lg border border-warm-600 bg-warm-700 px-4 py-2.5 text-warm-50 placeholder-warm-400 focus:border-copper-500 focus:outline-none resize-none" />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map(num => (
                    <button key={num} onClick={() => setSimNumber(num)}
                      className={cn("rounded py-1.5 text-xs font-medium border transition",
                        simNumber === num ? "border-copper-500 bg-copper-500/10 text-copper-500" : "border-warm-600 bg-warm-700 text-warm-400")}>
                      SIM {num}
                    </button>
                  ))}
                </div>
                <button onClick={() => smsMutation.mutate()} disabled={smsMutation.isPending || !smsBody}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-copper-500 py-2.5 font-bold text-warm-50 transition hover:bg-copper-600 disabled:opacity-50">
                  <Send className="h-4 w-4" /> Send SMS
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-warm-700 bg-warm-800">
              <div className="border-b border-warm-700 px-5 py-4"><h3 className="font-heading text-lg font-semibold text-warm-50">SMS History</h3></div>
              <div className="divide-y divide-warm-700 max-h-80 overflow-y-auto">
                {!smsMessages?.data?.length ? (
                  <div className="px-5 py-12 text-center text-warm-400">No SMS history.</div>
                ) : (
                  smsMessages.data.map((msg: any) => (
                    <div key={msg.id} className="px-5 py-4 transition hover:bg-warm-800">
                      <div className="flex items-center justify-between">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          msg.direction === "outbound" ? "bg-copper-500/10 text-copper-500" : "bg-warm-500/10 text-warm-300")}>{msg.direction}</span>
                        <span className="text-[10px] text-warm-500 uppercase">{formatDateTime(msg.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-warm-300">{msg.body}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium uppercase",
                          msg.status === "delivered" ? "text-green-400" : msg.status === "failed" ? "text-red-400" : "text-yellow-400")}>{msg.status}</span>
                        {msg.sim_number && <span className="text-[10px] text-warm-500">• SIM {msg.sim_number}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-warm-700 bg-warm-800">
              <div className="border-b border-warm-700 px-5 py-4"><h3 className="font-heading text-lg font-semibold text-warm-50">Email History</h3></div>
              <div className="divide-y divide-warm-700 max-h-80 overflow-y-auto">
                {!emailMessages?.data?.length ? (
                  <div className="px-5 py-12 text-center text-warm-400">No email history.</div>
                ) : (
                  emailMessages.data.map((email: any) => (
                    <div key={email.id} className="px-5 py-4 transition hover:bg-warm-800">
                      <div className="flex items-center justify-between">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          email.direction === "outbound" ? "bg-copper-500/10 text-copper-500" : "bg-warm-500/10 text-warm-300")}>{email.direction}</span>
                        <span className="text-[10px] text-warm-500 uppercase">{formatDateTime(email.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-warm-300">{email.subject}</p>
                      <p className="mt-1 text-sm text-warm-400 truncate">{email.body}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium uppercase",
                          email.status === "sent" || email.status === "received" ? "text-green-400" : email.status === "failed" ? "text-red-400" : "text-yellow-400")}>{email.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quotes Tab */}
      {activeTab === "quotes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-warm-50">{quotes.length} Quote{quotes.length !== 1 ? "s" : ""}</h2>
            <button onClick={() => setShowCreateQuote(true)}
              className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2 text-sm font-semibold text-warm-50 hover:bg-copper-600">
              <Plus className="h-4 w-4" /> New Quote
            </button>
          </div>
          {quotes.length === 0 ? (
            <div className="rounded-lg border border-warm-700 bg-warm-800 p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-warm-600" />
              <h3 className="mt-4 text-lg font-semibold text-warm-50">No quotes yet</h3>
              <p className="mt-2 text-warm-400">Create a quote for this repair to get started.</p>
              <button onClick={() => setShowCreateQuote(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2 text-sm font-semibold text-warm-50 hover:bg-copper-600">
                <Plus className="h-4 w-4" /> New Quote
              </button>
            </div>
          ) : (
            quotes.map((quote) => (
              <div key={quote.id} className="rounded-lg border border-warm-700 bg-warm-800 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-heading text-lg font-semibold text-warm-50">{quote.quote_number}</p>
                    <p className="text-sm text-warm-400">Issued {formatDate(quote.created_at)}</p>
                  </div>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getStatusColor(quote.status))}>
                    {getStatusLabel(quote.status)}
                  </span>
                </div>
                {quote.description && <p className="mt-3 text-sm text-warm-300">{quote.description}</p>}

                {/* Line items table */}
                {quote.items && quote.items.length > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-warm-700 text-left text-xs text-warm-400">
                          <th className="pb-2 font-medium">Description</th>
                          <th className="pb-2 font-medium">Type</th>
                          <th className="pb-2 text-right font-medium">Qty</th>
                          <th className="pb-2 text-right font-medium">Price</th>
                          <th className="pb-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-warm-700/50">
                        {quote.items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1.5 text-warm-50">{item.description}</td>
                            <td className="py-1.5 text-warm-400 capitalize">{item.item_type}</td>
                            <td className="py-1.5 text-right text-warm-300">{item.quantity}</td>
                            <td className="py-1.5 text-right text-warm-300">{formatCurrency(item.unit_price)}</td>
                            <td className="py-1.5 text-right text-warm-50">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-warm-600">
                          <td colSpan={4} className="pt-2 text-right text-xs text-warm-400">Subtotal</td>
                          <td className="pt-2 text-right text-warm-50">{formatCurrency(quote.items.reduce((s, i) => s + i.total, 0))}</td>
                        </tr>
                        <tr>
                          <td colSpan={4} className="pt-1 text-right text-xs text-warm-400">GST (10%)</td>
                          <td className="pt-1 text-right text-warm-50">{formatCurrency(quote.gst_amount)}</td>
                        </tr>
                        <tr>
                          <td colSpan={4} className="pt-1 text-right text-sm font-medium text-warm-300">Total</td>
                          <td className="pt-1 text-right font-semibold text-copper-500">{formatCurrency(quote.total_amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div><p className="text-xs text-warm-400">Labour</p><p className="text-warm-50">{formatCurrency(quote.labour_cost)}</p></div>
                    <div><p className="text-xs text-warm-400">Parts</p><p className="text-warm-50">{formatCurrency(quote.parts_cost)}</p></div>
                    <div><p className="text-xs text-warm-400">GST</p><p className="text-warm-50">{formatCurrency(quote.gst_amount)}</p></div>
                    <div><p className="text-xs text-warm-400">Total</p><p className="font-semibold text-copper-500">{formatCurrency(quote.total_amount)}</p></div>
                  </div>
                )}
                {quote.valid_until && <p className="mt-2 text-xs text-warm-400">Valid until: {formatDate(quote.valid_until)}</p>}

                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <label
                    className="flex items-center gap-1.5 rounded-lg border border-warm-600 px-3 py-1.5 text-xs text-warm-50 hover:bg-warm-700 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload PDF
                    <input type="file" accept=".pdf" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadQuotePdfMutation.mutate({ quoteId: quote.id, file });
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {(quote.status === "draft" || quote.status === "sent") && (
                    <button onClick={() => sendQuoteMutation.mutate(quote.id)}
                      disabled={sendQuoteMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-warm-600 px-3 py-1.5 text-xs text-copper-500 hover:bg-warm-700">
                      <Send className="h-3.5 w-3.5" /> Send
                    </button>
                  )}

                  {customerEmail && (quote.status === "draft" || quote.status === "sent") && emailTemplates && emailTemplates.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          sendQuoteEmailMutation.mutate({ templateId: e.target.value, quote });
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className="rounded-lg border border-warm-600 bg-warm-700 px-2 py-1.5 text-xs text-warm-300 focus:border-copper-500 focus:outline-none">
                      <option value="" disabled>Email template...</option>
                      {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}

                  {(quote.status === "draft" || quote.status === "sent") && (
                    <>
                      <button onClick={() => approveQuoteMutation.mutate(quote.id)}
                        disabled={approveQuoteMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-green-600/30 bg-green-500/5 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/5">
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button onClick={() => declineQuoteMutation.mutate(quote.id)}
                        disabled={declineQuoteMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-red-600/30 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20">
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-warm-50">{invoices.length} Invoice{invoices.length !== 1 ? "s" : ""}</h2>
            <button onClick={() => setShowCreateInvoice(true)}
              className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2 text-sm font-semibold text-warm-50 hover:bg-copper-600">
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </div>
          {invoices.length === 0 ? (
            <div className="rounded-lg border border-warm-700 bg-warm-800 p-8 text-center">
              <FileDown className="mx-auto h-12 w-12 text-warm-600" />
              <h3 className="mt-4 text-lg font-semibold text-warm-50">No invoices yet</h3>
              <p className="mt-2 text-warm-400">Create an invoice for this repair to get started.</p>
              <button onClick={() => setShowCreateInvoice(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2 text-sm font-semibold text-warm-50 hover:bg-copper-600">
                <Plus className="h-4 w-4" /> New Invoice
              </button>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-warm-700 bg-warm-800 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-heading text-lg font-semibold text-warm-50">{invoice.invoice_number}</p>
                    <p className="text-sm text-warm-400">Issued {formatDate(invoice.created_at)}</p>
                  </div>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getStatusColor(invoice.status))}>
                    {getStatusLabel(invoice.status)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div><p className="text-xs text-warm-400">Subtotal</p><p className="text-warm-50">{formatCurrency(invoice.subtotal)}</p></div>
                  <div><p className="text-xs text-warm-400">GST</p><p className="text-warm-50">{formatCurrency(invoice.gst_amount)}</p></div>
                  <div><p className="text-xs text-warm-400">Total</p><p className="font-semibold text-copper-500">{formatCurrency(invoice.total_amount)}</p></div>
                </div>
                {invoice.due_date && <p className="mt-3 text-sm text-warm-400">Due: {formatDate(invoice.due_date)}</p>}
                {invoice.notes && <p className="mt-2 text-sm text-warm-300">{invoice.notes}</p>}
                {invoice.status === "paid" && <p className="mt-2 text-sm text-green-400">Paid on {formatDate(invoice.paid_date)} — {formatCurrency(invoice.paid_amount || 0)}</p>}

                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <label
                    className="flex items-center gap-1.5 rounded-lg border border-warm-600 px-3 py-1.5 text-xs text-warm-50 hover:bg-warm-700 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload PDF
                    <input type="file" accept=".pdf" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadInvoicePdfMutation.mutate({ invoiceId: invoice.id, file });
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {(invoice.status === "draft" || invoice.status === "sent") && (
                    <button onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                      disabled={sendInvoiceMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-warm-600 px-3 py-1.5 text-xs text-copper-500 hover:bg-warm-700">
                      <Send className="h-3.5 w-3.5" /> Send
                    </button>
                  )}

                  {customerEmail && (invoice.status === "draft" || invoice.status === "sent") && emailTemplates && emailTemplates.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          sendInvoiceEmailMutation.mutate({ templateId: e.target.value, invoice });
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className="rounded-lg border border-warm-600 bg-warm-700 px-2 py-1.5 text-xs text-warm-300 focus:border-copper-500 focus:outline-none">
                      <option value="" disabled>Email template...</option>
                      {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}

                  {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                    <button onClick={() => markPaidMutation.mutate({ invoiceId: invoice.id, amount: invoice.total_amount })}
                      disabled={markPaidMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-green-600/30 bg-green-500/5 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/5">
                      <DollarSign className="h-3.5 w-3.5" /> Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-warm-50">{docs.length} Document{docs.length !== 1 ? "s" : ""}</h2>
            <label className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2 text-sm font-semibold text-warm-50 hover:bg-copper-600 cursor-pointer">
              <Upload className="h-4 w-4" /> Upload Document
              <input type="file" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadDocumentMutation.mutate({ repairId: id!, docType: "general", file });
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {docs.length === 0 ? (
            <div className="rounded-lg border border-warm-700 bg-warm-800 p-8 text-center">
              <Image className="mx-auto h-12 w-12 text-warm-600" />
              <h3 className="mt-4 text-lg font-semibold text-warm-50">No documents yet</h3>
              <p className="mt-2 text-warm-400">Upload documents such as quotes, invoices, or receipts.</p>
            </div>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-warm-700 bg-warm-800 p-4">
                <div>
                  <p className="font-medium text-warm-50">{doc.document_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  <p className="text-sm text-warm-400">{formatDate(doc.created_at)}</p>
                </div>
                <button onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                  className="flex items-center gap-2 rounded-lg border border-warm-600 px-4 py-2 text-sm text-warm-50 hover:bg-warm-700">
                  <Download className="h-4 w-4" /> Download
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === "photos" && (
        <div className="space-y-6">
          <PhotoUploader
            repairId={id}
            customerId={repair.customer?.id}
            onUploaded={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-repair-photos", id] });
              queryClient.invalidateQueries({ queryKey: ["admin-repair-photo-counts", id] });
              queryClient.invalidateQueries({ queryKey: ["admin-repair", id] });
            }}
          />
          <PhotoGallery
            photos={photoList}
            onDeletePhoto={(photoId) => photoDeleteMutation.mutate(photoId)}
            categoryCounts={categoryCounts}
          />
        </div>
      )}

      {/* Modals */}
      {showCreateQuote && (
        <CreateQuoteModal
          repairId={id!}
          customerName={repair.customer?.name || ""}
          onClose={() => setShowCreateQuote(false)}
          onSuccess={() => { setShowCreateQuote(false); invalidateRepair(); }}
        />
      )}
      {showCreateInvoice && (
        <CreateInvoiceModal
          repairId={id!}
          customerName={repair.customer?.name || ""}
          onClose={() => setShowCreateInvoice(false)}
          onSuccess={() => { setShowCreateInvoice(false); invalidateRepair(); }}
        />
      )}
    </div>
  );
}

