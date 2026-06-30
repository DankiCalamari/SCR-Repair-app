import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboardStats } from "../../api/dashboard";
import { listRepairs } from "../../api/repairs";
import { listLeads } from "../../api/leads";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import {
  Wrench, Users, FileText, DollarSign, Clock, AlertTriangle,
  MessageSquare, ArrowRight
} from "lucide-react";

export default function AdminDashboardPage() {
  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const { data: recentRepairs } = useQuery({
    queryKey: ["recent-repairs"],
    queryFn: () => listRepairs(0, 10),
  });

  const { data: recentLeads } = useQuery({
    queryKey: ["recent-leads"],
    queryFn: () => listLeads(0, 5, "new"),
  });

  const statCards = [
    {
      label: "New Leads",
      value: dashboardStats?.new_leads ?? 0,
      icon: Users,
      color: "text-accent-500 bg-accent-500/10",
      link: "/admin/leads",
    },
    {
      label: "Active Repairs",
      value: dashboardStats?.active_repairs ?? 0,
      icon: Wrench,
      color: "text-accent-500 bg-accent-500/10",
      link: "/admin/repairs",
    },
    {
      label: "Completed Repairs",
      value: dashboardStats?.completed_repairs ?? 0,
      icon: Clock,
      color: "text-green-400 bg-green-500/5",
      link: "/admin/repairs?status=completed",
    },
    {
      label: "Pending Quotes",
      value: dashboardStats?.pending_quotes ?? 0,
      icon: FileText,
      color: "text-yellow-400 bg-yellow-500/5",
      link: "/admin/quotes",
    },
    {
      label: "Overdue Invoices",
      value: dashboardStats?.overdue_invoices ?? 0,
      icon: AlertTriangle,
      color: "text-red-400 bg-red-500/5",
      link: "/admin/invoices",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(dashboardStats?.total_revenue ?? 0),
      icon: DollarSign,
      color: "text-emerald-400 bg-emerald-500/5",
      link: "/admin/invoices",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-surface-100">Dashboard</h1>
          <p className="mt-2 text-surface-400">Overview of your repair business</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="rounded-lg border border-surface-800 bg-surface-900 p-5 transition hover:border-accent-500/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-400">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-surface-100">{stat.value}</p>
                </div>
                <div className={cn("rounded-full p-3", stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Repairs */}
          <div className="rounded-lg border border-surface-800 bg-surface-900">
            <div className="flex items-center justify-between border-b border-surface-800 px-5 py-4">
              <h2 className="font-heading text-lg font-semibold text-surface-100">Recent Repairs</h2>
              <Link to="/admin/repairs" className="flex items-center gap-1 text-sm text-accent-500 hover:text-accent-400">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-surface-800">
              {recentRepairs?.data?.length === 0 ? (
                <div className="p-5 text-center text-surface-400">No repairs yet</div>
              ) : (
                recentRepairs?.data?.slice(0, 8).map((repair: any) => (
                  <Link
                    key={repair.id}
                    to={`/admin/repairs`}
                    className="flex items-center justify-between px-5 py-3 transition hover:bg-surface-800"
                  >
                    <div>
                      <p className="font-medium text-surface-100">{repair.ticket_number}</p>
                      <p className="text-sm text-surface-400">{repair.issue_description?.slice(0, 50)}...</p>
                    </div>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", getStatusColor(repair.status))}>
                      {getStatusLabel(repair.status)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="rounded-lg border border-surface-800 bg-surface-900">
            <div className="flex items-center justify-between border-b border-surface-800 px-5 py-4">
              <h2 className="font-heading text-lg font-semibold text-surface-100">New Leads</h2>
              <Link to="/admin/leads" className="flex items-center gap-1 text-sm text-accent-500 hover:text-accent-400">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-surface-800">
              {recentLeads?.data?.length === 0 ? (
                <div className="p-5 text-center text-surface-400">No new leads</div>
              ) : (
                recentLeads?.data?.slice(0, 5).map((lead: any) => (
                  <Link
                    key={lead.id}
                    to={`/admin/leads`}
                    className="flex items-center justify-between px-5 py-3 transition hover:bg-surface-800"
                  >
                    <div>
                      <p className="font-medium text-surface-100">{lead.name}</p>
                      <p className="text-sm text-surface-400">{lead.phone} &bull; {lead.device_type || "Unknown device"}</p>
                    </div>
                    <span className="text-xs text-surface-400">{formatDate(lead.created_at)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="mb-4 font-heading text-lg font-semibold text-surface-100">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link to="/admin/repairs" className="rounded-lg border border-surface-800 bg-surface-900 p-4 text-center transition hover:border-accent-500/30">
              <Wrench className="mx-auto h-6 w-6 text-accent-500" />
              <p className="mt-2 text-sm font-medium text-surface-100">New Repair</p>
            </Link>
            <Link to="/admin/customers" className="rounded-lg border border-surface-800 bg-surface-900 p-4 text-center transition hover:border-accent-500/30">
              <Users className="mx-auto h-6 w-6 text-accent-500" />
              <p className="mt-2 text-sm font-medium text-surface-100">Add Customer</p>
            </Link>
            <Link to="/admin/sms" className="rounded-lg border border-surface-800 bg-surface-900 p-4 text-center transition hover:border-accent-500/30">
              <MessageSquare className="mx-auto h-6 w-6 text-green-400" />
              <p className="mt-2 text-sm font-medium text-surface-100">Send SMS</p>
            </Link>
            <Link to="/admin/quotes" className="rounded-lg border border-surface-800 bg-surface-900 p-4 text-center transition hover:border-accent-500/30">
              <FileText className="mx-auto h-6 w-6 text-yellow-400" />
              <p className="mt-2 text-sm font-medium text-surface-100">Create Quote</p>
            </Link>
          </div>
        </div>
      </div>
  );
}
