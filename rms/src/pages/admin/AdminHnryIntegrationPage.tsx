import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, RefreshCw, ExternalLink, Zap, Clock, AlertCircle, Copy,
  ChevronRight, FileText, Users, Receipt, Save
} from "lucide-react";
import {
  getIntegrationSettings,
  updateIntegrationSettings,
  testIntegrationConnection,
  getSyncLogs,
  retrySyncLog,
} from "../../api/integrations";

export default function AdminHnryIntegrationPage() {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secretToken, setSecretToken] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"success" | "error" | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "logs">("settings");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["hnry-integration"],
    queryFn: () => getIntegrationSettings("hnry"),
  });

  const { data: syncLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["hnry-sync-logs"],
    queryFn: () => getSyncLogs("hnry", 50),
    enabled: activeTab === "logs",
  });

  const updateMutation = useMutation({
    mutationFn: (data: { is_enabled?: boolean; webhook_url?: string; secret_token?: string }) =>
      updateIntegrationSettings("hnry", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hnry-integration"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => testIntegrationConnection("hnry"),
    onSuccess: (data) => {
      setConnectionStatus(data.status === "success" ? "success" : "error");
    },
  });

  const retryMutation = useMutation({
    mutationFn: (logId: string) => retrySyncLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hnry-sync-logs"] });
    },
  });

  useState(() => {
    if (settings) {
      setWebhookUrl(settings.webhook_url || "");
      setIsEnabled(settings.is_enabled);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateMutation.mutateAsync({ is_enabled: isEnabled, webhook_url: webhookUrl, secret_token: secretToken });
  };

  const handleTest = async () => {
    setTestingConnection(true);
    try {
      await testMutation.mutateAsync();
    } finally {
      setTestingConnection(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText("https://zapier.com/apps/hnry/integrations");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-warm-50">Hnry Integration</h1>
        <p className="mt-1 text-warm-400">Connect to Hnry via Zapier for accounting automation</p>
      </div>

      {/* Status Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-warm-800 bg-warm-900 p-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${settings?.is_enabled ? "bg-green-500/10" : "bg-warm-700"}`}>
              <Zap className={`h-5 w-5 ${settings?.is_enabled ? "text-green-400" : "text-warm-400"}`} />
            </div>
            <div>
              <p className="text-xs text-warm-400">Integration Status</p>
              <p className="font-semibold text-warm-50">
                {settings?.is_enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-warm-800 bg-warm-900 p-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${settings?.last_sync_success ? "bg-green-500/10" : "bg-warm-700"}`}>
              <CheckCircle className={`h-5 w-5 ${settings?.last_sync_success ? "text-green-400" : "text-warm-400"}`} />
            </div>
            <div>
              <p className="text-xs text-warm-400">Last Sync Success</p>
              <p className="font-semibold text-warm-50">
                {settings?.last_sync_success ? new Date(settings.last_sync_success).toLocaleString() : "Never"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-warm-800 bg-warm-900 p-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${settings?.last_sync_error ? "bg-red-500/10" : "bg-warm-700"}`}>
              <XCircle className={`h-5 w-5 ${settings?.last_sync_error ? "text-red-400" : "text-warm-400"}`} />
            </div>
            <div>
              <p className="text-xs text-warm-400">Last Sync Error</p>
              <p className="font-semibold text-warm-50">
                {settings?.last_sync_error ? new Date(settings.last_sync_error).toLocaleString() : "None"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {settings?.error_message && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {settings.error_message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-warm-800">
        <button
          onClick={() => setActiveTab("settings")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === "settings" ? "border-copper-500 text-copper-500" : "border-transparent text-warm-400"
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === "logs" ? "border-copper-500 text-copper-500" : "border-transparent text-warm-400"
          }`}
        >
          Sync Logs
        </button>
      </div>

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Setup Instructions */}
          <div className="rounded-lg border border-copper-500/20 bg-copper-500/5 p-5">
            <h3 className="mb-3 font-semibold text-warm-50">Setup Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-warm-300">
              <li>Create a Zap in Zapier using the Hnry integration</li>
              <li>Choose "Catch Hook" as the trigger</li>
              <li>Copy the webhook URL and paste it below</li>
              <li>Configure Hnry actions (Create Client, Create Invoice, Raise Expense)</li>
              <li>Enable the integration and test the connection</li>
            </ol>
            <a
              href="https://zapier.com/apps/hnry/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-copper-500 hover:text-copper-400"
            >
              <ExternalLink className="h-4 w-4" />
              View Hnry Zapier Integration
            </a>
          </div>

          {/* Configuration */}
          <div className="rounded-lg border border-warm-800 bg-warm-900 p-6">
            <h2 className="mb-6 font-heading text-xl font-semibold text-warm-50">Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-warm-300">Enable Integration</label>
                <button
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`relative h-6 w-11 rounded-full transition ${isEnabled ? "bg-copper-500" : "bg-warm-700"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${isEnabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-warm-300">Webhook URL (from Zapier)</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  disabled={!isEnabled}
                  className="w-full rounded-lg border border-warm-700 bg-warm-800 px-4 py-2.5 text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-warm-500">The Catch Hook URL from your Zapier Zap</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-warm-300">Secret Token (optional)</label>
                <input
                  type="password"
                  value={secretToken}
                  onChange={(e) => setSecretToken(e.target.value)}
                  placeholder="Optional secret for request verification"
                  disabled={!isEnabled}
                  className="w-full rounded-lg border border-warm-700 bg-warm-800 px-4 py-2.5 text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-warm-500">If configured in Zapier, include it here for verification</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2 font-semibold text-warm-950 hover:bg-copper-600 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? "Saving..." : "Save Settings"}
                </button>
                <button
                  onClick={handleTest}
                  disabled={testingConnection || !webhookUrl}
                  className="flex items-center gap-2 rounded-lg border border-warm-700 bg-warm-800 px-4 py-2 text-warm-50 hover:bg-warm-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${testingConnection ? "animate-spin" : ""}`} />
                  Test Connection
                </button>
                {connectionStatus === "success" && (
                  <span className="flex items-center gap-1 text-sm text-green-400">
                    <CheckCircle className="h-4 w-4" /> Connected
                  </span>
                )}
                {connectionStatus === "error" && (
                  <span className="flex items-center gap-1 text-sm text-red-400">
                    <XCircle className="h-4 w-4" /> Failed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sync Options */}
          <div className="rounded-lg border border-warm-800 bg-warm-900 p-6">
            <h2 className="mb-6 font-heading text-xl font-semibold text-warm-50">Automatic Sync Options</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-warm-700 bg-warm-800 p-4">
                <div>
                  <p className="text-sm font-medium text-warm-50">Auto-sync Customers</p>
                  <p className="text-xs text-warm-400">Create/update clients in Hnry when customers are added</p>
                </div>
                <button className="relative h-6 w-11 rounded-full bg-warm-700">
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white" />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-warm-700 bg-warm-800 p-4">
                <div>
                  <p className="text-sm font-medium text-warm-50">Auto-sync Invoices</p>
                  <p className="text-xs text-warm-400">Create invoices in Hnry when status is Finalised</p>
                </div>
                <button className="relative h-6 w-11 rounded-full bg-copper-500">
                  <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white" />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-warm-700 bg-warm-800 p-4">
                <div>
                  <p className="text-sm font-medium text-warm-50">Auto-sync Expenses</p>
                  <p className="text-xs text-warm-400">Send expenses to Hnry when raised</p>
                </div>
                <button className="relative h-6 w-11 rounded-full bg-warm-700">
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="rounded-lg border border-warm-800 bg-warm-900">
          <div className="border-b border-warm-800 px-6 py-4">
            <h2 className="font-heading text-xl font-semibold text-warm-50">Sync History</h2>
          </div>
          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-copper-500 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-800 text-xs font-medium uppercase tracking-wider text-warm-400">
                    <th className="px-6 py-3 text-left">Timestamp</th>
                    <th className="px-3 py-3 text-left">Entity</th>
                    <th className="px-3 py-3 text-left">Action</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-right">Duration</th>
                    <th className="px-3 py-3 text-left">Error</th>
                    <th className="px-3 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-800">
                  {syncLogs?.map((log) => (
                    <tr key={log.id} className="text-sm">
                      <td className="px-6 py-3 text-warm-300">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-3 py-3 text-warm-300 capitalize">{log.entity_type}</td>
                      <td className="px-3 py-3 text-warm-300">{log.action}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                          log.status === "synced" ? "bg-green-500/10 text-green-400" :
                          log.status === "failed" ? "bg-red-500/10 text-red-400" :
                          "bg-warm-700 text-warm-300"
                        }`}>
                          {log.status === "synced" && <CheckCircle className="h-3 w-3" />}
                          {log.status === "failed" && <XCircle className="h-3 w-3" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-warm-300">{log.duration_ms ? `${log.duration_ms}ms` : "-"}</td>
                      <td className="px-3 py-3 text-warm-400 max-w-xs truncate">{log.error_message || "-"}</td>
                      <td className="px-3 py-3 text-center">
                        {log.status === "failed" && (
                          <button
                            onClick={() => retryMutation.mutate(log.id)}
                            disabled={retryMutation.isPending}
                            className="rounded p-1 text-copper-500 hover:bg-warm-700"
                            title="Retry"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!syncLogs?.length && (
                <div className="py-20 text-center text-warm-400">No sync logs found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}