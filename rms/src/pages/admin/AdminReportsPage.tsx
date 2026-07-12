import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Calendar, BarChart3, FileText, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { getReport, downloadReport } from "../../api/reports";

interface ReportData {
  period: string;
  total_repairs: number;
  completed_repairs: number;
  total_revenue: number;
  average_turnaround: number;
  popular_devices: Array<{ device: string; count: number }>;
}

// API function
async function fetchReportData(period: "week" | "month" | "quarter" | "year"): Promise<ReportData> {
  const data = await getReport(period);
  return data;
}

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const [downloading, setDownloading] = useState<null | "pdf" | "csv">(null);

  const { data: reportData, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-reports", period],
    queryFn: () => fetchReportData(period),
  });

  const handleDownload = async (format: "pdf" | "csv") => {
    setDownloading(format);
    try {
      // For now, use the API to get a download URL
      const result = await downloadReport(period, format);
      if (result.download_url) {
        // Open the download URL in a new tab
        window.open(result.download_url, "_blank");
      } else {
        // Fallback to blob download if backend returns direct file
        const response = await fetch(`/api/v1/reports/download?period=${period}&format=${format}`);
        if (!response.ok) throw new Error("Failed to download report");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `repairs-report-${period}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      alert(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDownloading(null);
    }
  };

  const periodLabel = {
    week: "This Week",
    month: "This Month",
    quarter: "This Quarter",
    year: "This Year",
  };

  return (
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-rms-text">Reports</h1>
            <p className="mt-1 text-rms-text-secondary">Business analytics and performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="rounded-lg border border-rms-border bg-rms-surface px-4 py-2.5 text-rms-text focus:border-brand-500 focus:outline-none"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={() => handleDownload("pdf")}
              disabled={downloading === "pdf"}
              className="flex items-center gap-2 rounded-lg border border-rms-border bg-rms-surface px-4 py-2.5 text-sm font-medium text-rms-text hover:bg-rms-raised disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> PDF
            </button>
            <button
              onClick={() => handleDownload("csv")}
              disabled={downloading === "csv"}
              className="flex items-center gap-2 rounded-lg border border-rms-border bg-rms-surface px-4 py-2.5 text-sm font-medium text-rms-text hover:bg-rms-raised disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-red-400">Failed to load report data</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-brand-500 hover:text-brand-600"
            >
              Try again
            </button>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-brand-500/10 p-2.5">
                    <FileText className="h-5 w-5 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm text-rms-text-secondary">Total Repairs</p>
                    <p className="text-2xl font-bold text-rms-text">{reportData.total_repairs}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/10 p-2.5">
                    <BarChart3 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-rms-text-secondary">Completed</p>
                    <p className="text-2xl font-bold text-rms-text">{reportData.completed_repairs}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-teal-500/10 p-2.5">
                    <TrendingUp className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm text-rms-text-secondary">Revenue</p>
                    <p className="text-2xl font-bold text-teal-400">{formatCurrency(reportData.total_revenue)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-purple-500/10 p-2.5">
                    <Calendar className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-rms-text-secondary">Avg Turnaround</p>
                    <p className="text-2xl font-bold text-rms-text">{reportData.average_turnaround}d</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Devices */}
            <div className="rounded-lg border border-rms-border bg-rms-surface">
              <div className="border-b border-rms-border px-5 py-4">
                <h2 className="font-heading text-lg font-semibold text-rms-text">Popular Devices</h2>
                <p className="text-sm text-rms-text-secondary">Most repaired devices {periodLabel[period].toLowerCase()}</p>
              </div>
              <div className="p-5">
                {reportData.popular_devices.length === 0 ? (
                  <p className="text-rms-text-secondary">No repair data available</p>
                ) : (
                  <div className="space-y-3">
                    {reportData.popular_devices.map((item, i) => (
                      <div key={item.device} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-500">
                            {i + 1}
                          </span>
                          <span className="text-rms-text">{item.device}</span>
                        </div>
                        <span className="text-sm text-rms-text-secondary">{item.count} repairs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="rounded-lg border border-rms-border bg-rms-surface">
              <div className="border-b border-rms-border px-5 py-4">
                <h2 className="font-heading text-lg font-semibold text-rms-text">Detailed Statistics</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-rms-text-secondary">Repair Completion Rate</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-rms-text">
                        {reportData.total_repairs > 0 
                          ? Math.round((reportData.completed_repairs / reportData.total_repairs) * 100) 
                          : 0}%
                      </span>
                      <span className="text-sm text-rms-text-secondary">
                        {reportData.completed_repairs} / {reportData.total_repairs}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-rms-text-secondary">Average Revenue per Repair</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-teal-400">
                        {reportData.completed_repairs > 0
                          ? formatCurrency(reportData.total_revenue / reportData.completed_repairs)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}