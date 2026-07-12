import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSmsMessages, sendSms, getGatewayStatus, getSmsTemplates, assignSmsToRepair } from "../../api/sms";
import { listRepairs } from "../../api/repairs";
import { formatDateTime, formatPhone, cn } from "../../lib/utils";
import type { SmsMessage, SmsTemplate } from "../../types";
import type { Repair } from "../../types";
import {
  Send, MessageSquare, Wifi, WifiOff, RefreshCw, ChevronLeft, ChevronRight,
  BatteryMedium, BatteryLow, BatteryFull, BatteryCharging,
  Smartphone, AlertCircle, FileText, Eye, X, Inbox, Link2
} from "lucide-react";

// ── Hook for real-time SMS events ────────────────────────────────────────────
function useSmsRealtime(queryClient: ReturnType<typeof useQueryClient>) {
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/admin/ws/repairs?token=${token}`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => ws?.send(JSON.stringify({ type: "subscribe" }));
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "sms_event") {
            queryClient.invalidateQueries({ queryKey: ["admin-sms"] });
            queryClient.invalidateQueries({ queryKey: ["admin-sms-unassigned"] });
            queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
          }
        } catch {}
      };
      ws.onclose = () => reconnectTimeout = setTimeout(connect, 3000);
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [queryClient]);
}

type Tab = "messages" | "unassigned" | "templates";

export default function AdminSmsPage() {
  const queryClient = useQueryClient();
  
  // Enable real-time SMS updates
  useSmsRealtime(queryClient);
  
  const [tab, setTab] = useState<Tab>("messages");
  const [page, setPage] = useState(0);
  const [unassignedPage, setUnassignedPage] = useState(0);
  const [toNumber, setToNumber] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [simNumber, setSimNumber] = useState<number>(1);
  const [previewTemplate, setPreviewTemplate] = useState<SmsTemplate | null>(null);
  const [assigningSms, setAssigningSms] = useState<string | null>(null);
  const [selectedRepair, setSelectedRepair] = useState<string>("");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sms", page],
    queryFn: () => listSmsMessages(page * pageSize, pageSize),
    refetchInterval: 30000,
  });

  const { data: unassignedData, isLoading: isLoadingUnassigned } = useQuery({
    queryKey: ["admin-sms-unassigned", unassignedPage],
    queryFn: () => listSmsMessages(unassignedPage * pageSize, pageSize, undefined, undefined, undefined, true),
    refetchInterval: 30000,
  });

  const { data: repairsData } = useQuery({
    queryKey: ["repairs-for-assign", assigningSms],
    queryFn: () => listRepairs(0, 100),
    enabled: !!assigningSms,
  });

  const assignMutation = useMutation({
    mutationFn: ({ smsId, repairId }: { smsId: string; repairId: string }) => assignSmsToRepair(smsId, repairId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sms-unassigned"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sms"] });
      setAssigningSms(null);
      setSelectedRepair("");
    },
  });

  const { data: gatewayStatus, isFetching: isFetchingStatus } = useQuery({
    queryKey: ["sms-gateway-status"],
    queryFn: getGatewayStatus,
    refetchInterval: 30000,
  });

  const { data: templates, isError: templatesError, error: templatesErrorMsg, isFetching: isFetchingTemplates } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: getSmsTemplates,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendSms({ to_number: toNumber, body: messageBody, sim_number: simNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sms"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sms-unassigned"] });
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      setToNumber("");
      setMessageBody("");
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to send SMS: ${message || "Unknown error"}`);
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const getBatteryIcon = (level: number, isCharging: boolean) => {
    if (isCharging) return <BatteryCharging className="h-5 w-5 text-green-400" />;
    if (level > 80) return <BatteryFull className="h-5 w-5 text-green-400" />;
    if (level > 20) return <BatteryMedium className="h-5 w-5 text-yellow-400" />;
    return <BatteryLow className="h-5 w-5 text-red-400" />;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-rms-text">SMS Dashboard</h1>
          <p className="mt-1 text-sm text-rms-text-secondary">Gateway health and message management</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["sms-gateway-status"] })}
          disabled={isFetchingStatus}
          className="flex items-center gap-2 rounded-lg border border-rms-border bg-rms-surface px-3 py-2 text-sm text-rms-text hover:bg-rms-raised disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isFetchingStatus && "animate-spin")} />
          <span className="hidden sm:inline">Refresh Status</span><span className="sm:hidden">Refresh</span>
        </button>
      </div>

      {/* Health Monitor */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-rms-text-secondary">Gateway Status</p>
            {gatewayStatus?.connected ? (
              <Wifi className="h-5 w-5 text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="mt-2">
            <p className={cn("text-2xl font-bold", gatewayStatus?.connected ? "text-green-400" : "text-red-400")}>
              {gatewayStatus?.connected ? (gatewayStatus.status || "Online") : "Offline"}
            </p>
            {gatewayStatus?.last_seen && (
              <p className="mt-1 text-xs text-rms-text0">
                Last seen: {formatDateTime(gatewayStatus.last_seen)}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-rms-text-secondary">Device Battery</p>
            {getBatteryIcon(gatewayStatus?.battery_level ?? 0, gatewayStatus?.is_charging ?? false)}
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-rms-text">
              {gatewayStatus?.battery_level != null ? `${gatewayStatus.battery_level}%` : "N/A"}
            </p>
            <p className="mt-1 text-xs text-rms-text0">
              {gatewayStatus?.is_charging ? "Charging" : "Unplugged"}
            </p>
          </div>
        </div>

        {gatewayStatus?.sim_cards?.map((sim) => (
          <div key={sim.number} className="rounded-lg border border-rms-border bg-rms-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-rms-text-secondary">SIM Slot {sim.number}</p>
              <Smartphone className={cn("h-5 w-5", sim.status === "active" ? "text-green-400" : "text-rms-text0")} />
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-rms-text truncate">
                {sim.operator || "No SIM"}
              </p>
              <p className={cn("mt-1 text-xs font-medium uppercase", sim.status === "active" ? "text-green-400" : "text-red-400")}>
                {sim.status}
              </p>
            </div>
          </div>
        ))}

        {!gatewayStatus?.sim_cards?.length && (
          <div className="rounded-lg border border-rms-border bg-rms-surface p-5 opacity-50">
            <p className="text-sm text-rms-text-secondary">SIM Cards</p>
            <p className="mt-2 text-lg font-bold text-rms-text0">No SIM data</p>
          </div>
        )}
      </div>

      {!gatewayStatus?.connected && (
        <div className="mb-8 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            <strong>Gateway Connection Error:</strong> {gatewayStatus?.message || "Check your gateway URL and credentials in Settings."}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 sm:mb-6 flex gap-1 overflow-x-auto rounded-lg border border-rms-border bg-rms-surface p-1 w-full sm:w-fit">
        <button
          onClick={() => setTab("messages")}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition",
            tab === "messages" ? "bg-brand-500 text-white" : "text-rms-text-secondary hover:text-rms-text"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Messages
        </button>
        <button
          onClick={() => setTab("unassigned")}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition",
            tab === "unassigned" ? "bg-brand-500 text-white" : "text-rms-text-secondary hover:text-rms-text"
          )}
        >
          <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden xs:inline">Unassigned</span><span className="xs:hidden">Un</span>
          {unassignedData?.total > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-1 py-0.5 text-[10px] font-bold text-amber-400">
              {unassignedData.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("templates")}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition",
            tab === "templates" ? "bg-brand-500 text-white" : "text-rms-text-secondary hover:text-rms-text"
          )}
        >
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Templates
        </button>
      </div>

      {tab === "messages" && (
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Send SMS Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-rms-border bg-rms-surface p-4 sm:p-5">
              <h2 className="mb-3 sm:mb-4 font-heading text-lg font-semibold text-rms-text">New Message</h2>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Recipient Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0400 000 000"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 sm:px-4 sm:py-2.5 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Message Content</label>
                  <textarea
                    placeholder="Type your message..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 sm:px-4 sm:py-2.5 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Select SIM Card</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSimNumber(num)}
                        className={cn(
                          "rounded-lg border py-2 text-xs sm:text-sm font-medium transition",
                          simNumber === num
                            ? "border-brand-500 bg-brand-500/10 text-brand-500"
                            : "border-rms-border bg-rms-raised text-rms-text-secondary hover:border-rms-border"
                        )}
                      >
                        SIM {num}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || !toNumber || !messageBody || !gatewayStatus?.connected}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 sm:py-3 font-bold text-white transition hover:bg-brand-600 disabled:opacity-50 text-sm sm:text-base"
                >
                  <Send className="h-4 w-4" />
                  {sendMutation.isPending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>

          {/* Message History */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-rms-border bg-rms-surface">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rms-border px-4 py-3 sm:px-5 sm:py-4">
                <h2 className="font-heading text-lg font-semibold text-rms-text mb-2 sm:mb-0">Recent Activity</h2>
                <div className="flex items-center gap-2 text-xs text-rms-text-secondary">
                  <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-brand-500" /> Outbound</span>
                  <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-rms-border" /> Inbound</span>
                </div>
              </div>
              <div className="divide-y divide-rms-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse px-4 py-3 sm:px-5 sm:py-4">
                      <div className="h-3.5 w-28 sm:h-4 sm:w-32 rounded bg-rms-raised" />
                      <div className="mt-1.5 sm:mt-2 h-2.5 w-36 sm:h-3 sm:w-48 rounded bg-rms-raised" />
                    </div>
                  ))
                ) : data?.data?.length === 0 ? (
                  <div className="px-4 py-12 sm:px-5 sm:py-24 text-center">
                    <MessageSquare className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-rms-text-secondary" />
                    <p className="mt-2 sm:mt-4 text-sm text-rms-text-secondary">No message history found</p>
                  </div>
                ) : (
                  data?.data?.map((msg: SmsMessage) => (
                    <div key={msg.id} className="group flex items-start gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4 transition hover:bg-rms-raised">
                      <div className={cn(
                        "mt-0.5 rounded-full p-1.5 sm:p-2 transition",
                        msg.direction === "outbound" ? "bg-brand-500/10 text-brand-500" : "bg-rms-border/10 text-rms-text-secondary"
                      )}>
                        {msg.direction === "outbound" ? <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="font-semibold text-rms-text text-xs sm:text-sm">
                              {msg.direction === "outbound" ? msg.to_number : msg.from_number}
                            </span>
                            {msg.sim_number && (
                              <span className="rounded bg-rms-raised px-1 py-0.5 text-[10px] sm:text-xs text-rms-text-secondary">
                                SIM {msg.sim_number}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] sm:text-[10px] text-rms-text0 uppercase tracking-wider">
                            {formatDateTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-rms-text-secondary line-clamp-2">{msg.body}</p>
                        <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-3">
                          <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            msg.status === "delivered" ? "bg-green-500/5 text-green-400" :
                            msg.status === "failed" ? "bg-red-500/5 text-red-400" :
                            "bg-yellow-500/5 text-yellow-400"
                          )}>
                            {msg.status}
                          </span>
                          {msg.error_message && (
                            <span className="text-[10px] text-red-400/80 truncate">
                              Error: {msg.error_message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-rms-border px-4 py-3 sm:px-5 sm:py-4">
                  <p className="text-[10px] sm:text-xs text-rms-text-secondary">Page {page + 1} of {totalPages}</p>
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-0.5 sm:gap-1 rounded border border-rms-border px-2.5 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-xs text-rms-text hover:bg-rms-raised disabled:opacity-50"
                    >
                      <ChevronLeft className="h-3 w-3" /> <span className="hidden xs:inline">Previous</span>
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex items-center gap-0.5 sm:gap-1 rounded border border-rms-border px-2.5 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-xs text-rms-text hover:bg-rms-raised disabled:opacity-50"
                    >
                      <span className="hidden xs:inline">Next</span> <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "unassigned" && (
        <div className="rounded-lg border border-rms-border bg-rms-surface">
          <div className="border-b border-rms-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-rms-text">Unassigned Inbound SMS</h2>
            <p className="mt-1 text-sm text-rms-text-secondary">
              Inbound messages that could not be automatically linked to a customer. Assign them to a repair ticket manually.
            </p>
          </div>
          <div className="divide-y divide-rms-border">
            {isLoadingUnassigned ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse px-5 py-4">
                  <div className="h-4 w-32 rounded bg-rms-raised" />
                  <div className="mt-2 h-3 w-48 rounded bg-rms-raised" />
                </div>
              ))
            ) : unassignedData?.data?.length === 0 ? (
              <div className="px-5 py-24 text-center">
                <Inbox className="mx-auto h-12 w-12 text-rms-text-secondary" />
                <p className="mt-4 text-rms-text-secondary">No unassigned messages</p>
                <p className="mt-1 text-xs text-rms-text0">All inbound SMS have been linked to customers</p>
              </div>
            ) : (
              unassignedData?.data?.map((msg: SmsMessage) => (
                <div key={msg.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 rounded-full p-2 bg-amber-500/10 text-amber-400">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rms-text">{msg.from_number}</span>
                        <span className="text-[10px] text-rms-text0 uppercase tracking-wider">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-rms-text-secondary">{msg.body}</p>

                      {assigningSms === msg.id ? (
                        <div className="mt-3 flex items-center gap-2">
                          <select
                            value={selectedRepair}
                            onChange={(e) => setSelectedRepair(e.target.value)}
                            className="flex-1 rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                          >
                            <option value="">Select a repair ticket...</option>
                            {repairsData?.data?.map((r: Repair) => (
                              <option key={r.id} value={r.id}>
                                {r.ticket_number} — {r.issue_description?.substring(0, 40)}...
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (selectedRepair) {
                                assignMutation.mutate({ smsId: msg.id, repairId: selectedRepair });
                              }
                            }}
                            disabled={!selectedRepair || assignMutation.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {assignMutation.isPending ? "Linking..." : "Assign"}
                          </button>
                          <button
                            onClick={() => { setAssigningSms(null); setSelectedRepair(""); }}
                            className="rounded-lg border border-rms-border px-3 py-2 text-sm text-rms-text-secondary hover:bg-rms-raised"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAssigningSms(msg.id); setSelectedRepair(""); }}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-rms-border px-3 py-1.5 text-xs font-medium text-rms-text-secondary hover:border-brand-500 hover:text-brand-500 transition"
                        >
                          <Link2 className="h-3 w-3" />
                          Assign to repair
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {unassignedData && Math.ceil(unassignedData.total / pageSize) > 1 && (
            <div className="flex items-center justify-between border-t border-rms-border px-5 py-4">
              <p className="text-xs text-rms-text-secondary">Showing page {unassignedPage + 1} of {Math.ceil(unassignedData.total / pageSize)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnassignedPage((p) => Math.max(0, p - 1))}
                  disabled={unassignedPage === 0}
                  className="flex items-center gap-1 rounded border border-rms-border px-3 py-1 text-xs text-rms-text hover:bg-rms-raised disabled:opacity-50"
                >
                  <ChevronLeft className="h-3 w-3" /> Previous
                </button>
                <button
                  onClick={() => setUnassignedPage((p) => Math.min(Math.ceil(unassignedData.total / pageSize) - 1, p + 1))}
                  disabled={unassignedPage >= Math.ceil(unassignedData.total / pageSize) - 1}
                  className="flex items-center gap-1 rounded border border-rms-border px-3 py-1 text-xs text-rms-text hover:bg-rms-raised disabled:opacity-50"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div className="rounded-lg border border-rms-border bg-rms-surface">
          <div className="border-b border-rms-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-rms-text">SMS Templates</h2>
            <p className="mt-1 text-sm text-rms-text-secondary">
              Pre-defined message templates with {"{{variable}}"} placeholders. Use them from the repair detail page.
            </p>
          </div>
          {isFetchingTemplates ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto h-12 w-12 animate-pulse rounded bg-rms-raised" />
              <p className="mt-4 text-rms-text-secondary">Loading templates...</p>
            </div>
          ) : templatesError ? (
            <div className="px-5 py-16 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <p className="mt-4 text-red-400">Failed to load templates</p>
              <p className="mt-1 text-xs text-rms-text0">{(templatesErrorMsg as Error)?.message || "Unknown error"}</p>
            </div>
          ) : (
            <>
              {!templates?.length ? (
                <div className="px-5 py-16 text-center">
                  <FileText className="mx-auto h-12 w-12 text-rms-text-secondary" />
                  <p className="mt-4 text-rms-text-secondary">No templates configured</p>
                </div>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-rms-text">{t.name}</p>
                      <p className="mt-1 text-sm text-rms-text-secondary line-clamp-2 font-mono">{t.body}</p>
                      {t.variables?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.variables.map((v) => (
                            <span key={v} className="rounded bg-rms-raised px-1.5 py-0.5 text-[10px] font-mono text-brand-600">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setPreviewTemplate(t)}
                      className="shrink-0 rounded-lg border border-rms-border p-2 text-rms-text-secondary hover:border-rms-border hover:text-rms-text transition"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="w-full max-w-lg rounded-lg border border-rms-border bg-rms-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-rms-text">{previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-rms-text-secondary hover:text-rms-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-lg bg-rms-surface p-4 mb-4">
              <p className="text-sm text-rms-text-secondary whitespace-pre-wrap font-mono">{previewTemplate.body}</p>
            </div>
            {previewTemplate.variables?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-rms-text-secondary mb-2">Variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewTemplate.variables.map((v) => (
                    <span key={v} className="rounded bg-brand-500/10 px-2 py-1 text-xs font-mono text-brand-600">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

