import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRepair, updateRepairStatus, updateRepair, getRepairTimeline, getRepairPhotos, getRepairDocuments } from "../../api/repairs";
import { createQuote, sendQuote, approveQuote, declineQuote, uploadQuotePdf } from "../../api/quotes";
import { createInvoice, sendInvoice, markInvoicePaid, uploadInvoicePdf } from "../../api/invoices";
import { downloadDocument, uploadDocument } from "../../api/documents";
import { sendSms, listSmsMessages, getSmsTemplates } from "../../api/sms";
import { sendEmail, sendEmailTemplate, getEmailTemplates, listEmails } from "../../api/email";
import { getPhotoCategoryCounts, deletePhoto } from "../../api/photos";
import { createBooking, listBookings } from "../../api/bookings";
import PhotoGallery from "../../components/photos/PhotoGallery";
import PhotoUploader from "../../components/photos/PhotoUploader";
import BookingModal from "../../components/bookings/BookingModal";
import { getStatusLabel, getStatusColor, formatDate, formatDateTime, formatCurrency, cn } from "../../lib/utils";
import type { RepairDetail, RepairStatus, Quote, Invoice, PhotoCategoryCount } from "../../types";
import {
  ArrowLeft, Smartphone, Image,
  Download, Clock, Camera, Plus, Receipt, Users, Wrench, X, Upload,
} from "lucide-react";

const ALL_STATUSES: RepairStatus[] = [
  "lead", "device_received", "diagnosing", "waiting_for_customer",
  "waiting_for_parts", "in_progress", "repaired", "ready_for_collection",
  "completed", "cancelled",
];

// ── Hook for real-time repair events ───────────────────────────────────────────
function useRealtimeRepairEvents(repairId: string | undefined, queryClient: ReturnType<typeof useQueryClient>) {
  useEffect(() => {
    if (!repairId) return;
    
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/admin/ws/repairs?token=${token}`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: "subscribe" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "repair_event") {
            const { event_type, repair_id } = data;
            
            // If the event is for this repair, refresh relevant queries
            if (repair_id === repairId) {
              queryClient.invalidateQueries({ queryKey: ["admin-repair", repairId] });
              queryClient.invalidateQueries({ queryKey: ["admin-repair-sms", repairId] });
              queryClient.invalidateQueries({ queryKey: ["admin-repair-email", repairId] });
              queryClient.invalidateQueries({ queryKey: ["admin-repair-timeline", repairId] });
            }
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [repairId, queryClient]);
}

function renderTemplate(text: string, data: Record<string, string | undefined>) {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
  }
  return result;
}

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-16">
      <div className="w-full max-w-lg rounded-lg border border-rms-border bg-rms-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-rms-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-rms-text">New Quote</h2>
          <button onClick={onClose} className="rounded p-1 text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-rms-text-secondary">Customer: <span className="text-rms-text">{customerName}</span></p>
          <div>
            <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Line Items</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <input type="text" placeholder="Description" value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    className="flex-1 rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none" />
                  <select value={item.item_type} onChange={(e) => updateItem(idx, "item_type", e.target.value)}
                    className="w-20 rounded-lg border border-rms-border bg-rms-raised px-2 py-2 text-xs text-rms-text focus:border-brand-500 focus:outline-none">
                    <option value="labour">Labour</option>
                    <option value="parts">Parts</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="number" min="1" placeholder="Qty" value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="w-14 rounded-lg border border-rms-border bg-rms-raised px-2 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none" />
                  <input type="number" min="0" step="0.01" placeholder="Price" value={item.unit_price || ""}
                    onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-rms-border bg-rms-raised px-2 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none" />
                  <button onClick={() => removeItem(idx)} disabled={items.length <= 1}
                    className="mt-1 rounded p-1 text-rms-text-secondary hover:text-red-400 disabled:opacity-30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 text-xs text-brand-500 hover:text-brand-600">+ Add Line Item</button>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Description / Notes</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Quote description..."
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Valid Until</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none" />
          </div>
          <div className="rounded-lg border border-rms-border bg-rms-raised p-3">
            <div className="flex justify-between text-sm"><span className="text-rms-text-secondary">Subtotal</span><span className="text-rms-text">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-rms-text-secondary">GST (10%)</span><span className="text-rms-text">${gst.toFixed(2)}</span></div>
            <div className="mt-1 flex justify-between border-t border-rms-border pt-1"><span className="font-medium text-rms-text-secondary">Total</span><span className="font-semibold text-brand-500">${total.toFixed(2)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised">Cancel</button>
            <button onClick={() => mutation.mutate({
              repair_id: repairId, description: description || null, valid_until: validUntil || null,
              items: items.filter(i => i.description.trim()).map((item, idx) => ({
                description: item.description, quantity: item.quantity, unit_price: item.unit_price,
                total: parseFloat((item.quantity * item.unit_price).toFixed(2)), item_type: item.item_type, sort_order: idx,
              })),
            })} disabled={mutation.isPending || !items.some(i => i.description.trim())}
              className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-16">
      <div className="w-full max-w-lg rounded-lg border border-rms-border bg-rms-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-rms-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-rms-text">New Invoice</h2>
          <button onClick={onClose} className="rounded p-1 text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-rms-text-secondary">Customer: <span className="text-rms-text">{customerName}</span></p>
          <div>
            <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Line Items</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <input type="text" placeholder="Description" value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    className="flex-1 rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none" />
                  <select value={item.item_type} onChange={(e) => updateItem(idx, "item_type", e.target.value)}
                    className="w-20 rounded-lg border border-rms-border bg-rms-raised px-2 py-2 text-xs text-rms-text focus:border-brand-500 focus:outline-none">
                    <option value="labour">Labour</option>
                    <option value="parts">Parts</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="number" min="1" placeholder="Qty" value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="w-14 rounded-lg border border-rms-border bg-rms-raised px-2 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none" />
                  <input type="number" min="0" step="0.01" placeholder="Price" value={item.unit_price || ""}
                    onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-rms-border bg-rms-raised px-2 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none" />
                  <button onClick={() => removeItem(idx)} disabled={items.length <= 1}
                    className="mt-1 rounded p-1 text-rms-text-secondary hover:text-red-400 disabled:opacity-30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 text-xs text-brand-500 hover:text-brand-600">+ Add Line Item</button>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none" />
          </div>
          <div className="rounded-lg border border-rms-border bg-rms-raised p-3">
            <div className="flex justify-between text-sm"><span className="text-rms-text-secondary">Subtotal</span><span className="text-rms-text">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-rms-text-secondary">GST (10%)</span><span className="text-rms-text">${gst.toFixed(2)}</span></div>
            <div className="mt-1 flex justify-between border-t border-rms-border pt-1"><span className="font-medium text-rms-text-secondary">Total</span><span className="font-semibold text-brand-500">${total.toFixed(2)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised">Cancel</button>
            <button onClick={() => mutation.mutate({
              repair_id: repairId, subtotal: parseFloat(subtotal.toFixed(2)), notes: notes || null, due_date: dueDate || null,
              items: items.filter(i => i.description.trim()).map((item, idx) => ({
                description: item.description, quantity: item.quantity, unit_price: item.unit_price,
                total: parseFloat((item.quantity * item.unit_price).toFixed(2)), item_type: item.item_type, sort_order: idx,
              })),
            })} disabled={mutation.isPending || !items.some(i => i.description.trim())}
              className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
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
  
  // Enable real-time repair events (SMS, status changes, etc.)
  useRealtimeRepairEvents(id, queryClient);
  
  const [activeTab, setActiveTab] = useState<"timeline" | "details" | "photos" | "documents" | "financial">("timeline");
  const [smsBody, setSmsBody] = useState("");
  const [simNumber, setSimNumber] = useState<number>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>("");
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);

  const { data: repairBookings } = useQuery({
    queryKey: ["repair-bookings", id],
    queryFn: () => listBookings(0, 50, undefined, undefined, undefined, undefined).then(r => r.data),
    enabled: !!id,
  });

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
    enabled: activeTab === "communication",
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
    queryClient.invalidateQueries({ queryKey: ["admin-repair-sms", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-repair-email", id] });
  };

  // Edit state for internal notes
  const [editingInternalNotes, setEditingInternalNotes] = useState(false);
  const [internalNotesDraft, setInternalNotesDraft] = useState(repair?.internal_notes || "");
  
  // Update repair mutation for internal notes editing
  const updateRepairMutation = useMutation({
    mutationFn: (data: any) => updateRepair(id!, data),
    onSuccess: () => {
      invalidateRepair();
      setEditingInternalNotes(false);
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to update repair: ${message || "Unknown error"}`);
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["admin-repair-sms", id] });
      invalidateRepair();
      setSmsBody("");
    },
  });

  const customEmailMutation = useMutation({
    mutationFn: () => sendEmail({
      to_address: repair?.customer?.email || "",
      subject: emailSubject,
      body: emailBody,
      repair_id: id,
      customer_id: repair?.customer?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      invalidateRepair();
      setEmailSubject("");
      setEmailBody("");
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

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-bookings", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rms-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rms-surface">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-rms-text">Repair not found</h2>
          <Link to="/admin/repairs" className="mt-4 inline-block text-brand-500 hover:text-brand-600">Back to Repairs</Link>
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
    { key: "timeline", label: "Timeline", icon: Clock },
    { key: "details", label: "Details", icon: Smartphone },
    { key: "photos", label: `Photos${photoList.length ? ` (${photoList.length})` : ""}`, icon: Camera },
    { key: "documents", label: `Documents${docs.length ? ` (${docs.length})` : ""}`, icon: Image },
    { key: "financial", label: "Financial", icon: Receipt },
  ] as const;

  const handleDownloadDocument = async (docId: string, filename: string) => {
    const blob = await downloadDocument(docId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/repairs" className="text-sm text-rms-text-secondary hover:text-rms-text">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="font-heading text-xl font-bold text-rms-text md:text-2xl">{repair.ticket_number}</h1>
            <select value={repair.status} onChange={(e) => statusMutation.mutate({ status: e.target.value })}
              disabled={statusMutation.isPending}
              className={cn("rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none", getStatusColor(repair.status))}>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateQuote(true)}
              className="flex items-center gap-1.5 rounded-lg border border-rms-border bg-rms-surface px-3 py-1.5 text-xs text-rms-text-secondary hover:bg-rms-raised"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Quote</span>
            </button>
            <button
              onClick={() => setShowCreateInvoice(true)}
              className="flex items-center gap-1.5 rounded-lg border border-rms-border bg-rms-surface px-3 py-1.5 text-xs text-rms-text-secondary hover:bg-rms-raised"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Invoice</span>
            </button>
          </div>
        </div>

        {/* MAIN WORKSPACE: Two columns on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main Content Area (2/3 width on desktop) */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-3 flex gap-1 overflow-x-auto border-b border-rms-border pb-px">
              {tabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn("flex items-center gap-2 whitespace-nowrap px-3 py-2 text-xs font-medium transition",
                    activeTab === tab.key ? "border-b-2 border-brand-500 text-brand-500" : "text-rms-text-secondary hover:text-rms-text")}>
                  <tab.icon className="h-3.5 w-3.5" />{tab.label}
                </button>
              ))}
            </div>

            {/* Timeline Tab (default) */}
            {activeTab === "timeline" && (
              <div className="rounded-lg border border-rms-border bg-rms-surface p-4">
                <div className="space-y-3">
                  {timelineEntries.length === 0 ? (
                    <p className="text-sm text-rms-text-secondary">No timeline entries yet.</p>
                  ) : (
                    timelineEntries.map((entry: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn("h-2.5 w-2.5 rounded-full ring-4", 
                            entry.type === "sms" ? "bg-purple-500 ring-purple-500/20" : 
                            entry.type === "email" ? "bg-teal-500 ring-teal-500/20" :
                            entry.type === "note" ? "bg-amber-500 ring-amber-500/20" :
                            "bg-brand-500 ring-brand-500/20")} />
                          {i < timelineEntries.length - 1 && <div className="w-0.5 flex-1 bg-rms-border" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-xs font-medium text-rms-text">
                            {entry.type === "sms" ? (entry.direction === "outbound" ? "SMS Sent" : "SMS Received") :
                             entry.type === "email" ? (entry.direction === "outbound" ? "Email Sent" : "Email Received") :
                             entry.type === "note" ? "Note Added" :
                             getStatusLabel(entry.status || entry.to_status)}
                          </p>
                          <p className="text-[10px] text-rms-text-secondary">{formatDateTime(entry.timestamp || entry.created_at)}</p>
                          {entry.body && <p className="mt-1 text-xs text-rms-text-secondary italic">"{entry.body}"</p>}
                          {entry.notes && <p className="mt-1 text-xs text-rms-text-secondary">{entry.notes}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="rounded-lg border border-rms-border bg-rms-surface p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase text-rms-text-secondary mb-2">Reported Issue</h3>
                  <p className="text-sm text-rms-text">{repair.issue_description}</p>
                </div>
                {repair.diagnosis && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-rms-text-secondary mb-2">Diagnosis</h3>
                    <p className="text-sm text-rms-text">{repair.diagnosis}</p>
                  </div>
                )}
                {repair.repair_notes && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-rms-text-secondary mb-2">Repair Notes</h3>
                    <p className="text-sm text-rms-text">{repair.repair_notes}</p>
                  </div>
                )}
                {(repair.internal_notes || editingInternalNotes) && !editingInternalNotes ? (
                  <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-xs font-medium text-brand-500">Internal Notes</h3>
                    </div>
                    <p className="text-xs text-rms-text-secondary">{repair.internal_notes}</p>
                  </div>
                ) : editingInternalNotes ? (
                  <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-3">
                    <textarea
                      value={internalNotesDraft}
                      onChange={(e) => setInternalNotesDraft(e.target.value)}
                      rows={2}
                      placeholder="Add internal notes..."
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-xs text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none resize-none"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => updateRepairMutation.mutate({ internal_notes: internalNotesDraft || null })}
                        disabled={updateRepairMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingInternalNotes(false)}
                        disabled={updateRepairMutation.isPending}
                        className="rounded-lg border border-rms-border px-2.5 py-1 text-xs text-rms-text-secondary hover:bg-rms-raised"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingInternalNotes(true)}
                    className="text-xs text-brand-500 hover:text-brand-600"
                  >
                    + Add internal notes
                  </button>
                )}
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === "photos" && (
              <div className="space-y-4">
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

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-rms-text">{docs.length} Document{docs.length !== 1 ? "s" : ""}</h2>
                  <label className="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 cursor-pointer">
                    <Upload className="h-3.5 w-3.5" /> Upload
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
                  <div className="text-center py-8">
                    <Image className="mx-auto h-8 w-8 text-rms-text-secondary" />
                    <p className="mt-2 text-sm text-rms-text-secondary">No documents yet</p>
                  </div>
                ) : (
                  docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border border-rms-border bg-rms-surface p-3">
                      <div>
                        <p className="text-xs font-medium text-rms-text">{doc.document_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                        <p className="text-[10px] text-rms-text-secondary">{formatDate(doc.created_at)}</p>
                      </div>
                      <button onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                        className="flex items-center gap-1.5 rounded-lg border border-rms-border px-2.5 py-1 text-xs text-rms-text-secondary hover:bg-rms-raised">
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Financial Tab */}
            {activeTab === "financial" && (
              <div className="rounded-lg border border-rms-border bg-rms-surface p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-rms-text-secondary">Labour Cost</p>
                    <p className="text-sm font-medium text-rms-text">
                      {repair.labour_cost ? formatCurrency(Number(repair.labour_cost)) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-rms-text-secondary">Parts Cost</p>
                    <p className="text-sm font-medium text-rms-text">
                      {repair.parts_cost ? formatCurrency(Number(repair.parts_cost)) : "—"}
                    </p>
                  </div>
                </div>
                {(quotes.length > 0 || invoices.length > 0) && (
                  <>
                    <div className="border-t border-rms-border pt-3">
                      <h3 className="text-xs font-semibold uppercase text-rms-text-secondary mb-2">Quotes</h3>
                      {quotes.map((quote) => (
                        <div key={quote.id} className="rounded-lg border border-rms-border bg-rms-raised p-3 mb-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-rms-text">{quote.quote_number}</span>
                            <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", getStatusColor(quote.status))}>
                              {getStatusLabel(quote.status)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-brand-500">{formatCurrency(quote.total_amount)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-rms-border pt-3">
                      <h3 className="text-xs font-semibold uppercase text-rms-text-secondary mb-2">Invoices</h3>
                      {invoices.map((invoice) => (
                        <div key={invoice.id} className="rounded-lg border border-rms-border bg-rms-raised p-3 mb-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-rms-text">{invoice.invoice_number}</span>
                            <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", getStatusColor(invoice.status))}>
                              {getStatusLabel(invoice.status)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-brand-500">{formatCurrency(invoice.total_amount)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Contextual Sidebar (1/3 width on desktop) */}
          <div className="space-y-4">
            {/* Customer Card */}
            {repair.customer && (
              <div className="rounded-lg border border-rms-border bg-rms-surface p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-brand-500" />
                  <h3 className="text-xs font-semibold uppercase text-rms-text-secondary">Customer</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-rms-text">{repair.customer.name}</p>
                  {repair.customer.phone && (
                    <p className="text-xs text-rms-text-secondary">{repair.customer.phone}</p>
                  )}
                  {repair.customer.email && (
                    <p className="text-xs text-rms-text-secondary truncate">{repair.customer.email}</p>
                  )}
                </div>
              </div>
            )}

            {/* Device Card */}
            {repair.device && (
              <div className="rounded-lg border border-rms-border bg-rms-surface p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="h-4 w-4 text-brand-500" />
                  <h3 className="text-xs font-semibold uppercase text-rms-text-secondary">Device</h3>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-rms-text-secondary">Type</span>
                    <span className="text-rms-text">{repair.device.device_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rms-text-secondary">Brand</span>
                    <span className="text-rms-text">{repair.device.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rms-text-secondary">Model</span>
                    <span className="text-rms-text">{repair.device.model}</span>
                  </div>
                  {repair.device.imei && (
                    <div className="flex justify-between">
                      <span className="text-rms-text-secondary">IMEI</span>
                      <span className="text-rms-text font-mono">{repair.device.imei}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Repair Card */}
            <div className="rounded-lg border border-rms-border bg-rms-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-brand-500" />
                <h3 className="text-xs font-semibold uppercase text-rms-text-secondary">Repair</h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-rms-text-secondary">Status</span>
                  <span className={cn("rounded-full border px-1.5 py-0.5", getStatusColor(repair.status))}>
                    {getStatusLabel(repair.status)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rms-text-secondary">Created</span>
                  <span className="text-rms-text">{formatDate(repair.created_at)}</span>
                </div>
                {repair.completed_date && (
                  <div className="flex justify-between">
                    <span className="text-rms-text-secondary">Completed</span>
                    <span className="text-rms-text">{formatDate(repair.completed_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
      {showCreateBooking && (
        <BookingModal
          booking={null}
          onClose={() => setShowCreateBooking(false)}
          onSuccess={() => { setShowCreateBooking(false); queryClient.invalidateQueries({ queryKey: ["repair-bookings", id] }); }}
        />
      )}
    </div>
  );
}
