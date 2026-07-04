import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listRepairs } from "../../api/repairs";
import { createInvoice } from "../../api/invoices";
import type { Repair } from "../../types";
import Modal from "../ui/Modal";
import { Search, ChevronRight, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  item_type: "labour" | "parts" | "other";
}

export default function NewInvoiceModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"repair" | "details">("repair");
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [repairSearch, setRepairSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, item_type: "labour" },
  ]);

  const { data: repairsData } = useQuery({
    queryKey: ["modal-repairs-invoice", repairSearch],
    queryFn: () => listRepairs(0, 20, undefined, repairSearch || undefined),
    enabled: open && step === "repair",
  });

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      resetAndClose();
    },
  });

  const resetAndClose = () => {
    setStep("repair");
    setSelectedRepair(null);
    setRepairSearch("");
    setNotes("");
    setDueDate("");
    setItems([{ description: "", quantity: 1, unit_price: 0, item_type: "labour" }]);
    onClose();
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, item_type: "parts" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    if (field === "item_type") {
      updated[index] = { ...updated[index], [field]: value as "labour" | "parts" | "other" };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const gst = subtotal * 0.10;
  const total = subtotal + gst;

  const handleCreate = () => {
    if (!selectedRepair) return;
    createMutation.mutate({
      repair_id: selectedRepair.id,
      subtotal: parseFloat(subtotal.toFixed(2)),
      notes: notes || null,
      due_date: dueDate || null,
      items: items
        .filter((i) => i.description.trim())
        .map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: parseFloat((item.quantity * item.unit_price).toFixed(2)),
          item_type: item.item_type,
          sort_order: idx,
        })),
    });
  };

  const repairs = repairsData?.data ?? [];

  return (
    <Modal open={open} onClose={resetAndClose} title="New Invoice" maxWidth="max-w-xl">
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className={`font-medium ${step === "repair" ? "text-copper-500" : "text-warm-400"}`}>Repair</span>
        <ChevronRight className="h-3 w-3 text-warm-600" />
        <span className={`font-medium ${step === "details" ? "text-copper-500" : "text-warm-400"}`}>Details</span>
      </div>

      {step === "repair" && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              placeholder="Search repairs by ticket number..."
              value={repairSearch}
              onChange={(e) => setRepairSearch(e.target.value)}
              className="w-full rounded-lg border border-warm-600 bg-warm-700 py-2.5 pl-10 pr-4 text-warm-50 placeholder-warm-400 focus:border-copper-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {repairs.map((r) => (
              <button
                key={r.id}
                onClick={() => { setSelectedRepair(r); setStep("details"); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-warm-700"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-copper-500/10 text-sm font-bold text-copper-500">
                  {r.ticket_number.slice(0, 3)}
                </div>
                <div>
                  <p className="text-sm font-medium text-warm-50">{r.ticket_number}</p>
                  <p className="text-xs text-warm-400">{r.issue_description.slice(0, 60)}{r.issue_description.length > 60 ? "..." : ""}</p>
                </div>
              </button>
            ))}
            {repairs.length === 0 && (
              <p className="py-8 text-center text-sm text-warm-400">
                {repairSearch ? "No repairs found" : "Type to search repairs"}
              </p>
            )}
          </div>
        </div>
      )}

      {step === "details" && selectedRepair && (
        <div>
          <p className="mb-4 text-sm text-warm-400">
            Repair: <span className="font-medium text-warm-50">{selectedRepair.ticket_number}</span>
          </p>
          <div className="space-y-4">
            {/* Line items */}
            <div>
              <label className="mb-2 block text-xs font-medium text-warm-400">Line Items</label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                      />
                    </div>
                    <select
                      value={item.item_type}
                      onChange={(e) => updateItem(idx, "item_type", e.target.value)}
                      className="w-20 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-xs text-warm-50 focus:border-copper-500 focus:outline-none"
                    >
                      <option value="labour">Labour</option>
                      <option value="parts">Parts</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="w-16 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={item.unit_price || ""}
                      onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-warm-600 bg-warm-700 px-2 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
                    />
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="mt-1 rounded p-1 text-warm-500 hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addItem}
                className="mt-2 flex items-center gap-1 text-xs text-copper-500 hover:text-copper-600"
              >
                <Plus className="h-3 w-3" /> Add Line Item
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-warm-400">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-warm-400">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Invoice notes..."
                className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
              />
            </div>

            {/* Totals preview */}
            <div className="rounded-lg border border-warm-600 bg-warm-700 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-warm-400">Subtotal</span>
                <span className="text-warm-50">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-warm-400">GST (10%)</span>
                <span className="text-warm-50">${gst.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-warm-600 pt-2">
                <span className="font-medium text-warm-300">Total</span>
                <span className="font-semibold text-copper-500">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setStep("repair")}
              className="flex-1 rounded-lg border border-warm-600 py-2.5 text-sm font-medium text-warm-300 hover:bg-warm-700"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !items.some((i) => i.description.trim())}
              className="flex-1 rounded-lg bg-copper-500 py-2.5 text-sm font-semibold text-warm-50 hover:bg-copper-600 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

