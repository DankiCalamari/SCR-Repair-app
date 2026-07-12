import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(date));
}

export function formatDateTime(date: string | null): string {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("61")) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  if (phone.startsWith("0")) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
  return phone;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    lead: "Lead",
    device_received: "Device Received",
    diagnosing: "Diagnosing",
    waiting_for_customer: "Waiting for Customer",
    waiting_for_parts: "Waiting for Parts",
    in_progress: "In Progress",
    repaired: "Repaired",
    ready_for_collection: "Ready for Collection",
    completed: "Completed",
    cancelled: "Cancelled",
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    declined: "Declined",
    expired: "Expired",
    paid: "Paid",
    overdue: "Overdue",
    active: "Active",
    claimed: "Claimed",
    void: "Void",
    new: "New",
    contacted: "Contacted",
    converted: "Converted",
    closed: "Closed",
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    lead: "bg-rms-raised text-rms-text-secondary border-rms-border",
    device_received: "bg-brand-500/10 text-brand-500 border-brand-500/20",
    diagnosing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    waiting_for_customer: "bg-amber-500/10 text-amber-400 border-brand-500/20",
    waiting_for_parts: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    in_progress: "bg-brand-500/10 text-brand-500 border-brand-500/20",
    repaired: "bg-green-500/10 text-green-400 border-green-500/20",
    ready_for_collection: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
    draft: "bg-rms-raised text-rms-text-secondary border-rms-border",
    sent: "bg-brand-500/10 text-brand-500 border-brand-500/20",
    approved: "bg-green-500/10 text-green-400 border-green-500/20",
    declined: "bg-red-500/10 text-red-400 border-red-500/20",
    paid: "bg-green-500/10 text-green-400 border-green-500/20",
    overdue: "bg-red-500/10 text-red-400 border-red-500/20",
    expired: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    void: "bg-rms-raised text-rms-text-secondary border-rms-border",
    new: "bg-brand-500/10 text-brand-500 border-brand-500/20",
    contacted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    converted: "bg-green-500/10 text-green-400 border-green-500/20",
    closed: "bg-rms-raised text-rms-text-secondary border-rms-border",
  };
  return colors[status] || "bg-rms-raised text-rms-text-secondary border-rms-border";
}
