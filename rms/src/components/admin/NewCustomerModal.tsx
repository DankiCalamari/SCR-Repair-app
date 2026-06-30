import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "../../api/customers";
import Modal from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewCustomerModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      resetAndClose();
    },
  });

  const resetAndClose = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) return;
    mutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Add Customer">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-300">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-2.5 text-surface-100 placeholder-surface-400 focus:border-accent-500 focus:outline-none"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-300">Phone *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0400 000 000"
            className="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-2.5 text-surface-100 placeholder-surface-400 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-2.5 text-surface-100 placeholder-surface-400 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-300">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address"
            className="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-2.5 text-surface-100 placeholder-surface-400 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-300">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes..."
            className="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-2.5 text-surface-100 placeholder-surface-400 focus:border-accent-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={resetAndClose}
          className="flex-1 rounded-lg border border-surface-600 py-2.5 text-sm font-medium text-surface-300 hover:bg-surface-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !phone.trim() || mutation.isPending}
          className="flex-1 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-surface-100 hover:bg-accent-400 disabled:opacity-50"
        >
          {mutation.isPending ? "Adding..." : "Add Customer"}
        </button>
      </div>
    </Modal>
  );
}
