import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboardStats, getRecentActivity } from "../../api/dashboard";
import { listRepairs } from "../../api/repairs";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import type { Repair } from "../../types";
import { Wrench, Users, FileText, Receipt, Clock, AlertCircle, Plus, ArrowRight, MessageSquare, DollarSign } from "lucide-react";

// Attention item type
interface AttentionItem {
  id: string;
  ticket_number: string;
  customer: { name: string };
  device: { device_type: string; brand: string; model: string } | null;
  reason: string;
  status: string;
  time_waiting: string;
}

// Active status counts
interface StatusCount {
  status: string;
  count: number;
  label: string;
}

export default function AdminDashboardPage() {
  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const { data: recentRepairs } = useQuery({
    queryKey: ["recent-repairs"],
    queryFn: () => listRepairs(0, 10),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["dashboard-recent-activity"],
    queryFn: getRecentActivity,
  });

  // Build attention items from repairs data - focus on actionable items
  const attentionItems: AttentionItem[] = (recentRepairs?.data || [])
    .filter((r: Repair) => {
      // Filter for items needing attention
      const needsAttentionStatuses = [
        "waiting_for_customer", "waiting_for_parts", "ready_for_collection"
      ];
      return needsAttentionStatuses.includes(r.status);
    })
    .map((r: Repair) => ({
      id: r.id,
      ticket_number: r.ticket_number,
      customer: { name: (r as any).customer?.name || "Unknown" },
      device: (r as any).device,
      reason: getAttentionReason(r.status),
      status: r.status,
      time_waiting: getTimeWaiting(r.created_at || r.updated_at),
    }));

  // Active status summary
  const activeStatusSummary: StatusCount[] = [
    { status: "device_received", count: 0, label: "Received" },
    { status: "diagnosing", count: 0, label: "Diagnosing" },
    { status: "waiting_for_customer", count: 0, label: "Waiting" },
    { status: "waiting_for_parts", count: 0, label: "Parts" },
    { status: "in_progress", count: 0, label: "In Progress" },
    { status: "repaired", count: 0, label: "Repaired" },
    { status: "ready_for_collection", count: 0, label: "Ready" },
  ];

  // Count active repairs by status
  (recentRepairs?.data || []).forEach((r: Repair) => {
    const statusItem = activeStatusSummary.find(s => s.status === r.status);
    if (statusItem && ["lead", "device_received", "diagnosing", "waiting_for_customer", "waiting_for_parts", "in_progress", "repaired", "ready_for_collection"].includes(r.status)) {
      statusItem.count++;
    }
  });

  return (
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header with + New Repair action */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-rms-text md:text-3xl">Dashboard</h1>
          </div>
          <Link
            to="/admin/repairs"
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Repair</span>
          </Link>
        </div>

        {/* Compact Metrics Strip */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border border-rms-border bg-rms-surface p-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-brand-500" />
              <span className="text-xs text-rms-text-secondary">Active Repairs</span>
            </div>
            <p className="mt-1 text-xl font-bold text-rms-text">{dashboardStats?.active_repairs ?? 0}</p>
          </div>
          <div className="rounded-lg border border-rms-border bg-rms-surface p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-rms-text-secondary">Waiting Customer</span>
            </div>
            <p className="mt-1 text-xl font-bold text-rms-text">
              {activeStatusSummary.find(s => s.status === "waiting_for_customer")?.count ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-rms-border bg-rms-surface p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-rms-text-secondary">Pending Quotes</span>
            </div>
            <p className="mt-1 text-xl font-bold text-rms-text">{dashboardStats?.pending_quotes ?? 0}</p>
          </div>
          <div className="rounded-lg border border-rms-border bg-rms-surface p-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-teal-500" />
              <span className="text-xs text-rms-text-secondary">Ready to Return</span>
            </div>
            <p className="mt-1 text-xl font-bold text-rms-text">
              {activeStatusSummary.find(s => s.status === "ready_for_collection")?.count ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-rms-border bg-rms-surface p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-teal-500" />
              <span className="text-xs text-rms-text-secondary">Revenue (MTD)</span>
            </div>
            <p className="mt-1 text-xl font-bold text-rms-text">
              {dashboardStats?.total_revenue != null ? formatCurrency(dashboardStats.total_revenue) : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* NEEDS ATTENTION Section */}
          <div className="rounded-lg border border-rms-border bg-rms-surface">
            <div className="flex items-center justify-between border-b border-rms-border px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-brand-500" />
                <h2 className="font-heading text-sm font-semibold uppercase text-rms-text">Needs Attention</h2>
              </div>
              <span className="text-xs text-rms-text-secondary">{attentionItems.length} items</span>
            </div>
            
            {attentionItems.length === 0 ? (
              <div className="p-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-rms-text-secondary" />
                <p className="mt-2 text-sm text-rms-text-secondary">All caught up!</p>
                <p className="text-xs text-rms-text-secondary/70">No urgent items require action</p>
              </div>
            ) : (
              <div className="divide-y divide-rms-border">
                {attentionItems.map((item) => (
                  <Link
                    key={item.id}
                    to={`/admin/repairs/${item.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-rms-raised transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-brand-500">{item.ticket_number}</span>
                        <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", getStatusColor(item.status))}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-rms-text-secondary truncate">{item.customer.name}</p>
                      {item.device && (
                        <p className="text-xs text-rms-text-secondary/70 truncate">
                          {item.device.brand} {item.device.model}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 text-right">
                      <p className="text-xs font-medium text-rms-text-secondary">{item.reason}</p>
                      <p className="text-[10px] text-rms-text-secondary/70">{item.time_waiting}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVE REPAIRS Status Summary */}
          <div className="rounded-lg border border-rms-border bg-rms-surface">
            <div className="border-b border-rms-border px-4 py-3">
              <h2 className="font-heading text-sm font-semibold uppercase text-rms-text">Active Repairs</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeStatusSummary.map((status) => (
                  <div key={status.status} className="text-center">
                    <div className="flex items-center justify-center">
                      <span className={cn(
                        "text-xs font-medium",
                        status.count > 0 ? "text-brand-500" : "text-rms-text-secondary"
                      )}>
                        {status.label}
                      </span>
                    </div>
                    <p className={cn(
                      "mt-1 text-2xl font-bold",
                      status.count > 0 ? "text-rms-text" : "text-rms-raised"
                    )}>
                      {status.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RECENT MESSAGES & ACTIVITY */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Messages */}
          <div className="rounded-lg border border-rms-border bg-rms-surface">
            <div className="flex items-center justify-between border-b border-rms-border px-4 py-3">
              <h2 className="font-heading text-sm font-semibold uppercase text-rms-text">Recent Messages</h2>
              <Link to="/admin/communications" className="text-xs text-brand-500 hover:text-brand-600">
                View all
              </Link>
            </div>
            <div className="p-4 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-rms-text-secondary" />
              <p className="mt-2 text-sm text-rms-text-secondary">Messages appear here</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg border border-rms-border bg-rms-surface">
            <div className="border-b border-rms-border px-4 py-3">
              <h2 className="font-heading text-sm font-semibold uppercase text-rms-text">Recent Activity</h2>
            </div>
            <div className="divide-y divide-rms-border max-h-64 overflow-y-auto">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="h-2 w-2 rounded-full bg-brand-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-rms-text-secondary truncate">{activity.description}</p>
                      <p className="text-[10px] text-rms-text-secondary/70">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-rms-text-secondary">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAttentionReason(status: string): string {
  const reasons: Record<string, string> = {
    waiting_for_customer: "Customer response",
    waiting_for_parts: "Parts needed",
    ready_for_collection: "Ready to return",
  };
  return reasons[status] || status;
}

function getTimeWaiting(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}