import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboardStats } from "../../api/dashboard";
import { listRepairs } from "../../api/repairs";
import { listLeads } from "../../api/leads";
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, cn } from "../../lib/utils";
import {
  Wrench, Users, FileText, DollarSign, Clock, AlertTriangle,
  MessageSquare, ArrowRight, Sparkles, TrendingUp, Calendar
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
      gradient: "from-copper-500 to-copper-600",
      bg: "bg-copper-500/10",
      link: "/admin/leads",
    },
    {
      label: "Active Repairs",
      value: dashboardStats?.active_repairs ?? 0,
      icon: Wrench,
      gradient: "from-copper-500 to-copper-600",
      bg: "bg-copper-500/10",
      link: "/admin/repairs",
    },
    {
      label: "Completed Repairs",
      value: dashboardStats?.completed_repairs ?? 0,
      icon: Clock,
      gradient: "from-green-500 to-emerald-500",
      bg: "bg-green-500/10",
      link: "/admin/repairs?status=completed",
    },
    {
      label: "Pending Quotes",
      value: dashboardStats?.pending_quotes ?? 0,
      icon: FileText,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-500/10",
      link: "/admin/quotes",
    },
    {
      label: "Overdue Invoices",
      value: dashboardStats?.overdue_invoices ?? 0,
      icon: AlertTriangle,
      gradient: "from-red-500 to-rose-500",
      bg: "bg-red-500/10",
      link: "/admin/invoices",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(dashboardStats?.total_revenue ?? 0),
      icon: DollarSign,
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-500/10",
      link: "/admin/invoices",
    },
  ];

  return (
    <div className="min-h-screen bg-warm-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-warm-50">Dashboard</h1>
            <p className="mt-1 text-warm-400">Overview of your repair business at a glance</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-warm-400">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="group rounded-xl border border-warm-800/50 bg-warm-900/50 p-5 transition-all duration-200 hover:border-copper-500/30 hover:bg-warm-800/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-warm-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-warm-50">{stat.value}</p>
                </div>
                <div className={cn("rounded-xl p-3 transition-transform group-hover:scale-110", stat.bg)}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-warm-800/50">
                <div 
                  className={cn("h-full rounded-full bg-gradient-to-r", stat.gradient)}
                  style={{ width: `${Math.min(100, (typeof stat.value === "number" ? stat.value : 5) * 10)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Repairs */}
          <div className="overflow-hidden rounded-xl border border-warm-800/50 bg-warm-900/50">
            <div className="flex items-center justify-between border-b border-warm-800/50 bg-warm-900/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-copper-500" />
                <h2 className="font-heading text-lg font-semibold text-warm-50">Recent Repairs</h2>
              </div>
              <Link to="/admin/repairs" className="flex items-center gap-1 text-sm text-copper-500 hover:text-copper-600">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-warm-800/50">
              {recentRepairs?.data?.length === 0 ? (
                <div className="p-8 text-center">
                  <Wrench className="mx-auto h-12 w-12 text-warm-700" />
                  <p className="mt-3 text-warm-400">No repairs yet</p>
                </div>
              ) : (
                recentRepairs?.data?.slice(0, 8).map((repair: any) => (
                  <Link
                    key={repair.id}
                    to={`/admin/repairs`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-warm-800/30"
                  >
                    <div>
                      <p className="font-medium text-warm-50">{repair.ticket_number}</p>
                      <p className="text-sm text-warm-400">{repair.issue_description?.slice(0, 50)}...</p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", getStatusColor(repair.status))}>
                      {getStatusLabel(repair.status)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="overflow-hidden rounded-xl border border-warm-800/50 bg-warm-900/50">
            <div className="flex items-center justify-between border-b border-warm-800/50 bg-warm-900/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-copper-500" />
                <h2 className="font-heading text-lg font-semibold text-warm-50">New Leads</h2>
              </div>
              <Link to="/admin/leads" className="flex items-center gap-1 text-sm text-copper-500 hover:text-copper-600">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-warm-800/50">
              {recentLeads?.data?.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-warm-700" />
                  <p className="mt-3 text-warm-400">No new leads</p>
                </div>
              ) : (
                recentLeads?.data?.slice(0, 5).map((lead: any) => (
                  <Link
                    key={lead.id}
                    to={`/admin/leads`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-warm-800/30"
                  >
                    <div>
                      <p className="font-medium text-warm-50">{lead.name}</p>
                      <p className="text-sm text-warm-400">{lead.phone} • {lead.device_type || "Unknown device"}</p>
                    </div>
                    <span className="text-xs text-warm-400">{formatDate(lead.created_at)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-copper-500" />
            <h2 className="font-heading text-lg font-semibold text-warm-50">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link 
              to="/admin/repairs" 
              className="group flex flex-col items-center rounded-xl border border-warm-800/50 bg-warm-900/50 p-6 text-center transition-all duration-200 hover:border-copper-500/30 hover:bg-warm-800/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-copper-500/10 transition-transform group-hover:scale-110">
                <Wrench className="h-6 w-6 text-copper-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-warm-50">New Repair</p>
            </Link>
            <Link 
              to="/admin/customers" 
              className="group flex flex-col items-center rounded-xl border border-warm-800/50 bg-warm-900/50 p-6 text-center transition-all duration-200 hover:border-copper-500/30 hover:bg-warm-800/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-copper-500/10 transition-transform group-hover:scale-110">
                <Users className="h-6 w-6 text-copper-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-warm-50">Add Customer</p>
            </Link>
            <Link 
              to="/admin/sms" 
              className="group flex flex-col items-center rounded-xl border border-warm-800/50 bg-warm-900/50 p-6 text-center transition-all duration-200 hover:border-copper-500/30 hover:bg-warm-800/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 transition-transform group-hover:scale-110">
                <MessageSquare className="h-6 w-6 text-green-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-warm-50">Send SMS</p>
            </Link>
            <Link 
              to="/admin/quotes" 
              className="group flex flex-col items-center rounded-xl border border-warm-800/50 bg-warm-900/50 p-6 text-center transition-all duration-200 hover:border-copper-500/30 hover:bg-warm-800/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10 transition-transform group-hover:scale-110">
                <FileText className="h-6 w-6 text-yellow-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-warm-50">Create Quote</p>
            </Link>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-copper-500" />
            <h2 className="font-heading text-lg font-semibold text-warm-50">Performance Summary</h2>
          </div>
          <div className="rounded-xl border border-warm-800/50 bg-warm-900/50 p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-warm-50">{dashboardStats?.completion_rate ?? 0}%</p>
                <p className="mt-1 text-sm text-warm-400">Completion Rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-warm-50">{dashboardStats?.avg_turnaround ?? 0} days</p>
                <p className="mt-1 text-sm text-warm-400">Avg. Turnaround</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-warm-50">{formatCurrency(dashboardStats?.monthly_revenue ?? 0)}</p>
                <p className="mt-1 text-sm text-warm-400">This Month</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
