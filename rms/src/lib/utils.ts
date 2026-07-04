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
    lead: "bg-warm-100 text-warm-700 border-warm-200 dark:bg-warm-800 dark:text-warm-300 dark:border-warm-700",
    device_received: "bg-copper-50 text-copper-700 border-copper-200 dark:bg-copper-500/15 dark:text-copper-300 dark:border-copper-500/25",
    diagnosing: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
    waiting_for_customer: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/25",
    waiting_for_parts: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/25",
    in_progress: "bg-copper-50 text-copper-700 border-copper-200 dark:bg-copper-500/15 dark:text-copper-300 dark:border-copper-500/25",
    repaired: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
    ready_for_collection: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/25",
    completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
    cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
    draft: "bg-warm-100 text-warm-700 border-warm-200 dark:bg-warm-800 dark:text-warm-300 dark:border-warm-700",
    sent: "bg-copper-50 text-copper-700 border-copper-200 dark:bg-copper-500/15 dark:text-copper-300 dark:border-copper-500/25",
    approved: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
    declined: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
    paid: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
    overdue: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
    expired: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/25",
    active: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
    new: "bg-copper-50 text-copper-700 border-copper-200 dark:bg-copper-500/15 dark:text-copper-300 dark:border-copper-500/25",
    contacted: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
    converted: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  };
  return colors[status] || "bg-warm-100 text-warm-700 border-warm-200 dark:bg-warm-800 dark:text-warm-300 dark:border-warm-700";
}
