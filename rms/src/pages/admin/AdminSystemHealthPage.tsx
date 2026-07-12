import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../../api/dashboard";
import { formatCurrency, cn } from "../../lib/utils";
import {
  Activity, Database, Server, HardDrive, CheckCircle2,
  XCircle, AlertTriangle, Cpu, MemoryStick
} from "lucide-react";
import LogViewer from "../../components/admin/LogViewer";

interface HealthCheck {
  name: string;
  status: "healthy" | "warning" | "error";
  message: string;
  icon: React.ElementType;
}

export default function AdminSystemHealthPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  // Simulated health checks — in production these would come from a /health endpoint
  const healthChecks: HealthCheck[] = [
    { name: "API Server", status: "healthy", message: "Running normally", icon: Server },
    { name: "Database", status: "healthy", message: "Connected — 12ms latency", icon: Database },
    { name: "SMS Gateway", status: "healthy", message: "Connected", icon: Activity },
    { name: "Email Service", status: "warning", message: "IMAP not configured", icon: AlertTriangle },
    { name: "Disk Space", status: "healthy", message: "42% used (58GB free)", icon: HardDrive },
  ];

  const statusColors = {
    healthy: "text-green-400 bg-green-500/5",
    warning: "text-yellow-400 bg-yellow-500/5",
    error: "text-red-400 bg-red-500/5",
  };

  const statusIcons = {
    healthy: CheckCircle2,
    warning: AlertTriangle,
    error: XCircle,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-rms-text">System Health</h1>
          <p className="mt-1 text-rms-text-secondary">Monitor system status and performance</p>
        </div>

        {/* Health Checks */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {healthChecks.map((check) => {
            const StatusIcon = statusIcons[check.status];
            return (
              <div key={check.name} className="rounded-lg border border-rms-border bg-rms-surface p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("rounded-full p-2.5", statusColors[check.status])}>
                      <check.icon className={cn("h-5 w-5", statusColors[check.status].split(" ")[0])} />
                    </div>
                    <div>
                      <p className="font-medium text-rms-text">{check.name}</p>
                      <p className="text-sm text-rms-text-secondary">{check.message}</p>
                    </div>
                  </div>
                  <StatusIcon className={cn("h-5 w-5", statusColors[check.status].split(" ")[0])} />
                </div>
              </div>
            );
          })}
        </div>

        {/* System Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
            <div className="flex items-center gap-3 mb-4">
              <Cpu className="h-5 w-5 text-brand-500" />
              <h3 className="font-heading text-lg font-semibold text-rms-text">System Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">Total Repairs</span>
                <span className="text-rms-text font-medium">{stats?.total_repairs ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">Active Repairs</span>
                <span className="text-rms-text font-medium">{stats?.active_repairs ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">Completed Repairs</span>
                <span className="text-rms-text font-medium">{stats?.completed_repairs ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">Pending Quotes</span>
                <span className="text-rms-text font-medium">{stats?.pending_quotes ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">Overdue Invoices</span>
                <span className="text-rms-text font-medium">{stats?.overdue_invoices ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
            <div className="flex items-center gap-3 mb-4">
              <MemoryStick className="h-5 w-5 text-brand-500" />
              <h3 className="font-heading text-lg font-semibold text-rms-text">Financial Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">Total Revenue</span>
                <span className="text-rms-text font-medium">{stats?.total_revenue != null ? formatCurrency(stats.total_revenue) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">Outstanding Balance</span>
                <span className="text-rms-text font-medium">{stats?.outstanding_balance != null ? formatCurrency(stats.outstanding_balance) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">New Leads</span>
                <span className="text-rms-text font-medium">{stats?.new_leads ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rms-text-secondary">Warranty Claims</span>
                <span className="text-rms-text font-medium">{stats?.warranty_claims ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Logs */}
        <div className="mb-8">
          <LogViewer maxEntries={300} />
        </div>
    </div>
  );
}

