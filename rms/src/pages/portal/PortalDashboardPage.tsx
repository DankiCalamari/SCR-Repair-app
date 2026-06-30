import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { getCustomer, getCustomerRepairs } from "../../api/customers";
import { getStatusLabel, getStatusColor, formatDate } from "../../lib/utils";
import type { Repair } from "../../types";
import { Wrench, CheckCircle2, Clock, AlertCircle } from "lucide-react";

function RepairCard({ repair }: { repair: Repair }) {
  const isActive = !["completed", "cancelled"].includes(repair.status);
  return (
    <Link
      to={`/portal/repairs/${repair.id}`}
      className="block rounded-lg border border-warm-200 bg-white p-5 transition hover:border-accent-300 hover:bg-warm-100"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-heading text-lg font-semibold text-warm-900">{repair.ticket_number}</p>
          <p className="mt-1 text-sm text-warm-500">{repair.device_id ? "Device loaded" : "Loading..."}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(repair.status)}`}>
          {getStatusLabel(repair.status)}
        </span>
      </div>
      <p className="mt-3 text-sm text-warm-600 line-clamp-2">{repair.issue_description}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-warm-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Updated {formatDate(repair.updated_at)}
        </span>
        {isActive && (
          <span className="flex items-center gap-1 text-accent-500">
            <Wrench className="h-3.5 w-3.5" />
            Active
          </span>
        )}
      </div>
    </Link>
  );
}

export default function PortalDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: customerData } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => getCustomer(user?.id || ""),
    enabled: !!user?.id,
  });

  const { data: repairsData, isLoading } = useQuery({
    queryKey: ["portal-repairs"],
    queryFn: () => getCustomerRepairs(customerData?.id || ""),
    enabled: !!customerData?.id,
  });

  const customer = customerData;
  const repairs = repairsData || [];
  const activeRepairs = repairs.filter((r: Repair) => !["completed", "cancelled"].includes(r.status));
  const completedRepairs = repairs.filter((r: Repair) => r.status === "completed");

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-warm-900">
            Welcome back, {customer?.name?.split(" ")[0] || user?.full_name?.split(" ")[0] || "Customer"}
          </h1>
          <p className="mt-2 text-warm-500">Track your repairs and manage your account</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-warm-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent-50 p-2.5">
                <Wrench className="h-5 w-5 text-accent-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warm-900">{activeRepairs.length}</p>
                <p className="text-sm text-warm-500">Active Repairs</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-warm-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-50 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warm-900">{completedRepairs.length}</p>
                <p className="text-sm text-warm-500">Completed</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-warm-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent-50 p-2.5">
                <AlertCircle className="h-5 w-5 text-accent-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warm-900">{repairs.length}</p>
                <p className="text-sm text-warm-500">Total Repairs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Repairs */}
        <div className="mb-8">
          <h2 className="mb-4 font-heading text-xl font-semibold text-warm-900">Your Repairs</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-lg bg-warm-100" />
              ))}
            </div>
          ) : repairs.length === 0 ? (
            <div className="rounded-lg border border-warm-200 bg-white p-8 text-center">
              <Wrench className="mx-auto h-12 w-12 text-warm-400" />
              <h3 className="mt-4 text-lg font-semibold text-warm-900">No repairs yet</h3>
              <p className="mt-2 text-warm-500">
                You haven't submitted any repair requests yet. Contact us to get started.
              </p>
              <Link
                to="/contact"
                className="mt-4 inline-block rounded-lg bg-accent-500 px-6 py-2 font-semibold text-white hover:bg-accent-600"
              >
                Contact Us
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {repairs.map((repair: Repair) => (
                <RepairCard key={repair.id} repair={repair} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="mb-4 font-heading text-xl font-semibold text-warm-900">Quick Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to="/contact"
              className="rounded-lg border border-warm-200 bg-white p-5 transition hover:border-accent-300"
            >
              <h3 className="font-semibold text-warm-900">Request a Quote</h3>
              <p className="mt-1 text-sm text-warm-500">Get a free assessment and quote for your device</p>
            </Link>
            <Link
              to="/warranty"
              className="rounded-lg border border-warm-200 bg-white p-5 transition hover:border-accent-300"
            >
              <h3 className="font-semibold text-warm-900">Warranty Info</h3>
              <p className="mt-1 text-sm text-warm-500">View our 90-day workmanship warranty terms</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
