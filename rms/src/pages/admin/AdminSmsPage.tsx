import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSmsMessages, sendSms, getGatewayStatus, getSmsTemplates, assignSmsToRepair } from "../../api/sms";
import { listRepairs } from "../../api/repairs";
import { formatDateTime, cn } from "../../lib/utils";
import type { SmsMessage, SmsTemplate } from "../../api/sms";
import type { Repair } from "../../types";
import {
  Send, MessageSquare, Wifi, WifiOff, RefreshCw, ChevronLeft, ChevronRight,
  BatteryMedium, BatteryLow, BatteryFull, BatteryCharging,
  Smartphone, AlertCircle, FileText, Eye, X, Inbox, Link2
} from "lucide-react";

type Tab = "messages" | "unassigned" | "templates";

export default function AdminSmsPage() {
  const queryClient = useQueryClient();
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
  });

  const { data: unassignedData, isLoading: isLoadingUnassigned } = useQuery({
    queryKey: ["admin-sms-unassigned", unassignedPage],
    queryFn: () => listSmsMessages(unassignedPage * pageSize, pageSize, undefined, undefined, undefined, true),
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

  const { data: templates } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: getSmsTemplates,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendSms({ to_number: toNumber, body: messageBody, sim_number: simNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sms"] });
      setToNumber("");
      setMessageBody("");
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
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-surface-100">SMS Dashboard</h1>
          <p className="mt-1 text-surface-400">Gateway health and message management</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["sms-gateway-status"] })}
          disabled={isFetchingStatus}
          className="flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-900 px-4 py-2 text-sm text-surface-100 hover:bg-surface-800 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isFetchingStatus && "animate-spin")} />
          Refresh Status
        </button>
      </div>

      {/* Health Monitor */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-surface-800 bg-surface-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-400">Gateway Status</p>
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
              <p className="mt-1 text-xs text-surface-500">
                Last seen: {formatDateTime(gatewayStatus.last_seen)}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-surface-800 bg-surface-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-400">Device Battery</p>
            {getBatteryIcon(gatewayStatus?.battery_level ?? 0, gatewayStatus?.is_charging ?? false)}
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-surface-100">
              {gatewayStatus?.battery_level != null ? `${gatewayStatus.battery_level}%` : "N/A"}
            </p>
            <p className="mt-1 text-xs text-surface-500">
              {gatewayStatus?.is_charging ? "Charging" : "Unplugged"}
            </p>
          </div>
        </div>

        {gatewayStatus?.sim_cards?.map((sim) => (
          <div key={sim.number} className="rounded-lg border border-surface-800 bg-surface-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-surface-400">SIM Slot {sim.number}</p>
              <Smartphone className={cn("h-5 w-5", sim.status === "active" ? "text-green-400" : "text-surface-500")} />
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-surface-100 truncate">
                {sim.operator || "No SIM"}
              </p>
              <p className={cn("mt-1 text-xs font-medium uppercase", sim.status === "active" ? "text-green-400" : "text-red-400")}>
                {sim.status}
              </p>
            </div>
          </div>
        ))}

        {!gatewayStatus?.sim_cards?.length && (
          <div className="rounded-lg border border-surface-800 bg-surface-900 p-5 opacity-50">
            <p className="text-sm text-surface-400">SIM Cards</p>
            <p className="mt-2 text-lg font-bold text-surface-500">No SIM data</p>
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
      <div className="mb-6 flex gap-1 rounded-lg border border-surface-800 bg-surface-900 p-1 w-fit">
        <button
          onClick={() => setTab("messages")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
            tab === "messages" ? "bg-accent-500 text-surface-950" : "text-surface-400 hover:text-surface-100"
          )}
        >
          <MessageSquare className="h-4 w-4" /> Messages
        </button>
        <button
          onClick={() => setTab("unassigned")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
            tab === "unassigned" ? "bg-accent-500 text-surface-950" : "text-surface-400 hover:text-surface-100"
          )}
        >
          <Inbox className="h-4 w-4" /> Unassigned
          {unassignedData?.total > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              {unassignedData.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("templates")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
            tab === "templates" ? "bg-accent-500 text-surface-950" : "text-surface-400 hover:text-surface-100"
          )}
        >
          <FileText className="h-4 w-4" /> Templates
        </button>
      </div>

      {tab === "messages" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Send SMS Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-surface-800 bg-surface-900 p-5 sticky top-8">
              <h2 className="mb-4 font-heading text-lg font-semibold text-surface-100">New Message</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-surface-400">Recipient Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0400 000 000"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-surface-400">Message Content</label>
                  <textarea
                    placeholder="Type your message..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-surface-400">Select SIM Card</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSimNumber(num)}
                        className={cn(
                          "rounded-lg border py-2 text-sm font-medium transition",
                          simNumber === num
                            ? "border-accent-500 bg-accent-500/10 text-accent-500"
                            : "border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600"
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
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 py-3 font-bold text-surface-950 transition hover:bg-accent-400 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {sendMutation.isPending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>

          {/* Message History */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-surface-800 bg-surface-900">
              <div className="flex items-center justify-between border-b border-surface-800 px-5 py-4">
                <h2 className="font-heading text-lg font-semibold text-surface-100">Recent Activity</h2>
                <div className="flex items-center gap-2 text-xs text-surface-400">
                  <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-accent-500" /> Outbound</span>
                  <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-surface-400" /> Inbound</span>
                </div>
              </div>
              <div className="divide-y divide-surface-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse px-5 py-4">
                      <div className="h-4 w-32 rounded bg-surface-800" />
                      <div className="mt-2 h-3 w-48 rounded bg-surface-800" />
                    </div>
                  ))
                ) : data?.data?.length === 0 ? (
                  <div className="px-5 py-24 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-surface-600" />
                    <p className="mt-4 text-surface-400">No message history found</p>
                  </div>
                ) : (
                  data?.data?.map((msg: SmsMessage) => (
                    <div key={msg.id} className="group flex items-start gap-4 px-5 py-4 transition hover:bg-surface-800">
                      <div className={cn(
                        "mt-0.5 rounded-full p-2 transition",
                        msg.direction === "outbound" ? "bg-accent-500/10 text-accent-500" : "bg-surface-500/10 text-surface-300"
                      )}>
                        {msg.direction === "outbound" ? <Send className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-surface-100">
                              {msg.direction === "outbound" ? msg.to_number : msg.from_number}
                            </span>
                            {msg.sim_number && (
                              <span className="rounded bg-surface-700 px-1 py-0.5 text-[10px] text-surface-300">
                                SIM {msg.sim_number}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-surface-500 uppercase tracking-wider">
                            {formatDateTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-surface-300 line-clamp-2">{msg.body}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
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
                <div className="flex items-center justify-between border-t border-surface-800 px-5 py-4">
                  <p className="text-xs text-surface-400">Showing page {page + 1} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 rounded border border-surface-700 px-3 py-1 text-xs text-surface-100 hover:bg-surface-800 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-3 w-3" /> Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex items-center gap-1 rounded border border-surface-700 px-3 py-1 text-xs text-surface-100 hover:bg-surface-800 disabled:opacity-50"
                    >
                      Next <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "unassigned" && (
        <div className="rounded-lg border border-surface-800 bg-surface-900">
          <div className="border-b border-surface-800 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-surface-100">Unassigned Inbound SMS</h2>
            <p className="mt-1 text-sm text-surface-400">
              Inbound messages that could not be automatically linked to a customer. Assign them to a repair ticket manually.
            </p>
          </div>
          <div className="divide-y divide-surface-800">
            {isLoadingUnassigned ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse px-5 py-4">
                  <div className="h-4 w-32 rounded bg-surface-800" />
                  <div className="mt-2 h-3 w-48 rounded bg-surface-800" />
                </div>
              ))
            ) : unassignedData?.data?.length === 0 ? (
              <div className="px-5 py-24 text-center">
                <Inbox className="mx-auto h-12 w-12 text-surface-600" />
                <p className="mt-4 text-surface-400">No unassigned messages</p>
                <p className="mt-1 text-xs text-surface-500">All inbound SMS have been linked to customers</p>
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
                        <span className="font-semibold text-surface-100">{msg.from_number}</span>
                        <span className="text-[10px] text-surface-500 uppercase tracking-wider">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-surface-300">{msg.body}</p>

                      {assigningSms === msg.id ? (
                        <div className="mt-3 flex items-center gap-2">
                          <select
                            value={selectedRepair}
                            onChange={(e) => setSelectedRepair(e.target.value)}
                            className="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-accent-500 focus:outline-none"
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
                            className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 hover:bg-accent-400 disabled:opacity-50"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {assignMutation.isPending ? "Linking..." : "Assign"}
                          </button>
                          <button
                            onClick={() => { setAssigningSms(null); setSelectedRepair(""); }}
                            className="rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-400 hover:bg-surface-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAssigningSms(msg.id); setSelectedRepair(""); }}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-surface-700 px-3 py-1.5 text-xs font-medium text-surface-300 hover:border-accent-500 hover:text-accent-500 transition"
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
            <div className="flex items-center justify-between border-t border-surface-800 px-5 py-4">
              <p className="text-xs text-surface-400">Showing page {unassignedPage + 1} of {Math.ceil(unassignedData.total / pageSize)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnassignedPage((p) => Math.max(0, p - 1))}
                  disabled={unassignedPage === 0}
                  className="flex items-center gap-1 rounded border border-surface-700 px-3 py-1 text-xs text-surface-100 hover:bg-surface-800 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3 w-3" /> Previous
                </button>
                <button
                  onClick={() => setUnassignedPage((p) => Math.min(Math.ceil(unassignedData.total / pageSize) - 1, p + 1))}
                  disabled={unassignedPage >= Math.ceil(unassignedData.total / pageSize) - 1}
                  className="flex items-center gap-1 rounded border border-surface-700 px-3 py-1 text-xs text-surface-100 hover:bg-surface-800 disabled:opacity-50"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div className="rounded-lg border border-surface-800 bg-surface-900">
          <div className="border-b border-surface-800 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-surface-100">SMS Templates</h2>
            <p className="mt-1 text-sm text-surface-400">
              Pre-defined message templates with {"{{variable}}"} placeholders. Use them from the repair detail page.
            </p>
          </div>
          <div className="divide-y divide-surface-800">
            {!templates?.length ? (
              <div className="px-5 py-16 text-center">
                <FileText className="mx-auto h-12 w-12 text-surface-600" />
                <p className="mt-4 text-surface-400">No templates configured</p>
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-100">{t.name}</p>
                    <p className="mt-1 text-sm text-surface-300 line-clamp-2 font-mono">{t.body}</p>
                    {t.variables?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.variables.map((v) => (
                          <span key={v} className="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] font-mono text-accent-400">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setPreviewTemplate(t)}
                    className="shrink-0 rounded-lg border border-surface-700 p-2 text-surface-400 hover:border-surface-600 hover:text-surface-100 transition"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="w-full max-w-lg rounded-lg border border-surface-800 bg-surface-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-surface-100">{previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-surface-400 hover:text-surface-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-lg bg-surface-950 p-4 mb-4">
              <p className="text-sm text-surface-200 whitespace-pre-wrap font-mono">{previewTemplate.body}</p>
            </div>
            {previewTemplate.variables?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-surface-400 mb-2">Variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewTemplate.variables.map((v) => (
                    <span key={v} className="rounded bg-accent-500/10 px-2 py-1 text-xs font-mono text-accent-400">
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
