import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUnassignedCommunications,
  listAllConversations,
  assignEmail,
  assignSms,
  convertLead,
  updateLeadStatus,
} from "../../api/communications";
import { listRepairs } from "../../api/repairs";
import { sendEmail, getEmailTemplates } from "../../api/email";
import { sendSms, getGatewayStatus, getSmsTemplates } from "../../api/sms";
import { formatDateTime, cn } from "../../lib/utils";
import type { Repair, EmailTemplate, SmsTemplate } from "../../types";
import type { UnassignedCommunication, Conversation, ConversationMessage } from "../../api/communications";
import {
  Mail, MessageSquare, Link2, ChevronLeft, ChevronRight, Inbox,
  X, Send, UserPlus, Phone, CheckCircle2, ArrowLeft,
} from "lucide-react";

type Tab = "inbox" | "conversations";

export default function AdminCommunicationsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("inbox");
  const [page, setPage] = useState(0);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assigningType, setAssigningType] = useState<string | null>(null);
  const [selectedRepair, setSelectedRepair] = useState<string>("");
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [replyType, setReplyType] = useState<"email" | "sms">("email");
  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const pageSize = 20;

  const { data, isLoading, refetch: refetchInbox } = useQuery({
    queryKey: ["admin-communications-inbox", page],
    queryFn: () => listUnassignedCommunications(page * pageSize, pageSize),
    refetchInterval: 30000,
  });

  const { data: conversationsData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["admin-communications-conversations", page],
    queryFn: () => listAllConversations(page * pageSize, pageSize),
    refetchInterval: 30000,
  });

  const { data: repairsData } = useQuery({
    queryKey: ["repairs-for-assign", assigningId],
    queryFn: () => listRepairs(0, 100),
    enabled: !!assigningId,
  });

  const { data: gatewayStatus } = useQuery({
    queryKey: ["sms-gateway-status"],
    queryFn: getGatewayStatus,
    refetchInterval: 30000,
  });

  const { data: emailTemplates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
  });

  const { data: smsTemplates } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: getSmsTemplates,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, repairId, type }: { id: string; repairId: string; type: string }) => {
      if (type === "email") return assignEmail(id, repairId);
      if (type === "sms") return assignSms(id, repairId);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      setAssigningId(null);
      setAssigningType(null);
      setSelectedRepair("");
    },
  });

  const convertLeadMutation = useMutation({
    mutationFn: (leadId: string) => convertLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["admin-repairs"] });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) => updateLeadStatus(leadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      if (replyType === "email") {
        await sendEmail({ to_address: replyTo, subject: replySubject || "Re:", body: replyBody });
      } else {
        await sendSms({ to_number: replyTo, body: replyBody });
      }
    },
    onSuccess: () => {
      setReplyBody("");
      setReplySubject("");
      setActiveConversation(null);
      queryClient.invalidateQueries({ queryKey: ["admin-communications-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to send reply: ${message || "Unknown error"}`);
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const convTotalPages = conversationsData ? Math.ceil(conversationsData.total / pageSize) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-rms-text">Communications</h1>
        <p className="mt-1 text-rms-text-secondary">
          Manage inbound messages, conversations, and contact form submissions
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-rms-border bg-rms-surface p-1 w-fit">
        <button
          onClick={() => { setTab("inbox"); setActiveConversation(null); }}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
            tab === "inbox" ? "bg-brand-500 text-white" : "text-rms-text-secondary hover:text-rms-text"
          )}
        >
          <Inbox className="h-4 w-4" /> Inbox
          {data && data.total > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              {data.total}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab("conversations"); setActiveConversation(null); }}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
            tab === "conversations" ? "bg-brand-500 text-white" : "text-rms-text-secondary hover:text-rms-text"
          )}
        >
          <MessageSquare className="h-4 w-4" /> Conversations
        </button>
      </div>

      {/* INBOX TAB */}
      {tab === "inbox" && (
        <div className="rounded-lg border border-rms-border bg-rms-surface">
          <div className="border-b border-rms-border px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-rms-text">Unassigned Messages</h2>
              <button
                onClick={() => refetchInbox()}
                className="flex items-center gap-1.5 rounded-lg border border-rms-border px-3 py-1.5 text-xs text-rms-text-secondary hover:bg-rms-raised"
              >
                <ArrowLeft className="h-3 w-3 rotate-45" /> Refresh
              </button>
            </div>
            <p className="mt-1 text-sm text-rms-text-secondary">
              Emails, SMS, and contact form submissions not yet linked to a customer or repair
            </p>
          </div>

          <div className="divide-y divide-rms-raised">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse px-5 py-4">
                  <div className="h-4 w-40 rounded bg-rms-raised" />
                  <div className="mt-2 h-3 w-56 rounded bg-rms-raised" />
                </div>
              ))
            ) : !data?.data?.length ? (
              <div className="px-5 py-24 text-center">
                <Inbox className="mx-auto h-12 w-12 text-rms-text-secondary" />
                <p className="mt-4 text-rms-text-secondary">No unassigned communications</p>
                <p className="mt-1 text-xs text-rms-text0">All messages have been linked to customers</p>
              </div>
            ) : (
              data?.data.map((item: UnassignedCommunication) => (
                <div key={`${item.type}-${item.id}`} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-0.5 rounded-full p-2",
                      item.type === "email" ? "bg-brand-500/10 text-brand-500" :
                      item.type === "sms" ? "bg-purple-500/10 text-purple-400" :
                      "bg-green-500/10 text-green-400"
                    )}>
                      {item.type === "email" ? <Mail className="h-4 w-4" /> :
                       item.type === "sms" ? <MessageSquare className="h-4 w-4" /> :
                       <UserPlus className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-rms-text">{item.from}</span>
                          <span className="rounded bg-rms-raised px-1.5 py-0.5 text-[10px] font-medium uppercase text-rms-text-secondary">
                            {item.type === "lead" ? "contact form" : item.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-rms-text0 uppercase tracking-wider">
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>
                      {item.subject && (
                        <p className="mt-0.5 text-sm font-medium text-rms-text-secondary">{item.subject}</p>
                      )}
                      <p className="mt-1 text-sm text-rms-text-secondary line-clamp-2 whitespace-pre-line">{item.body}</p>

                      {assigningId === item.id && assigningType === item.type ? (
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
                                assignMutation.mutate({ id: item.id, repairId: selectedRepair, type: item.type });
                              }
                            }}
                            disabled={!selectedRepair || assignMutation.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {assignMutation.isPending ? "Linking..." : "Assign"}
                          </button>
                          <button
                            onClick={() => { setAssigningId(null); setAssigningType(null); setSelectedRepair(""); }}
                            className="rounded-lg border border-rms-border px-3 py-2 text-sm text-rms-text-secondary hover:bg-rms-raised"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {item.type === "lead" ? (
                            <>
                              <button
                                onClick={() => convertLeadMutation.mutate(item.id)}
                                disabled={convertLeadMutation.isPending}
                                className="flex items-center gap-1.5 rounded-lg border border-green-600/30 bg-green-600/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/20 transition"
                              >
                                <UserPlus className="h-3 w-3" />
                                Convert to Repair
                              </button>
                              <button
                                onClick={() => updateLeadMutation.mutate({ leadId: item.id, status: "contacted" })}
                                disabled={updateLeadMutation.isPending}
                                className="flex items-center gap-1.5 rounded-lg border border-rms-border px-3 py-1.5 text-xs font-medium text-rms-text-secondary hover:border-brand-500 hover:text-brand-500 transition"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Mark Contacted
                              </button>
                              <button
                                onClick={() => updateLeadMutation.mutate({ leadId: item.id, status: "closed" })}
                                disabled={updateLeadMutation.isPending}
                                className="flex items-center gap-1.5 rounded-lg border border-red-600/30 bg-red-600/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/20 transition"
                              >
                                <X className="h-3 w-3" />
                                Close
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setAssigningId(item.id); setAssigningType(item.type); setSelectedRepair(""); }}
                              className="flex items-center gap-1.5 rounded-lg border border-rms-border px-3 py-1.5 text-xs font-medium text-rms-text-secondary hover:border-brand-500 hover:text-brand-500 transition"
                            >
                              <Link2 className="h-3 w-3" />
                              Assign to repair
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-rms-border px-5 py-4">
              <p className="text-xs text-rms-text-secondary">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="flex items-center gap-1 rounded border border-rms-border px-3 py-1 text-xs text-rms-text hover:bg-rms-raised disabled:opacity-50">
                  <ChevronLeft className="h-3 w-3" /> Previous
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 rounded border border-rms-border px-3 py-1 text-xs text-rms-text hover:bg-rms-raised disabled:opacity-50">
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONVERSATIONS TAB */}
      {tab === "conversations" && !activeConversation && (
        <div className="rounded-lg border border-rms-border bg-rms-surface">
          <div className="border-b border-rms-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-rms-text">Conversations</h2>
            <p className="mt-1 text-sm text-rms-text-secondary">All email and SMS threads grouped by contact</p>
          </div>

          <div className="divide-y divide-rms-raised">
            {isLoadingConversations ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse px-5 py-4">
                  <div className="h-4 w-40 rounded bg-rms-raised" />
                  <div className="mt-2 h-3 w-56 rounded bg-rms-raised" />
                </div>
              ))
            ) : !conversationsData?.data?.length ? (
              <div className="px-5 py-24 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-rms-text-secondary" />
                <p className="mt-4 text-rms-text-secondary">No conversations yet</p>
              </div>
            ) : (
              conversationsData?.data.map((conv: Conversation) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv);
                    if (conv.contact_email) {
                      setReplyType("email");
                      setReplyTo(conv.contact_email);
                    } else {
                      setReplyType("sms");
                      setReplyTo(conv.contact_phone || "");
                    }
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-rms-raised transition"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-0.5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      conv.last_message_direction === "inbound" ? "bg-brand-500/10 text-brand-500" : "bg-rms-raised text-rms-text-secondary"
                    )}>
                      {conv.contact_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rms-text">{conv.contact_name}</span>
                        <span className="text-[10px] text-rms-text0">{formatDateTime(conv.last_message_at)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {conv.contact_email && (
                          <span className="flex items-center gap-1 text-xs text-rms-text0">
                            <Mail className="h-3 w-3" /> {conv.contact_email}
                          </span>
                        )}
                        {conv.contact_phone && (
                          <span className="flex items-center gap-1 text-xs text-rms-text0">
                            <Phone className="h-3 w-3" /> {conv.contact_phone}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-rms-text-secondary line-clamp-1">{conv.last_message_body}</p>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {convTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-rms-border px-5 py-4">
              <p className="text-xs text-rms-text-secondary">Page {page + 1} of {convTotalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="flex items-center gap-1 rounded border border-rms-border px-3 py-1 text-xs text-rms-text hover:bg-rms-raised disabled:opacity-50">
                  <ChevronLeft className="h-3 w-3" /> Previous
                </button>
                <button onClick={() => setPage((p) => Math.min(convTotalPages - 1, p + 1))} disabled={page >= convTotalPages - 1}
                  className="flex items-center gap-1 rounded border border-rms-border px-3 py-1 text-xs text-rms-text hover:bg-rms-raised disabled:opacity-50">
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONVERSATION DETAIL */}
      {tab === "conversations" && activeConversation && (
        <div className="rounded-lg border border-rms-border bg-rms-surface">
          <div className="border-b border-rms-border px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveConversation(null)}
                className="rounded-lg border border-rms-border p-1.5 text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="font-heading text-lg font-semibold text-rms-text">{activeConversation.contact_name}</h2>
                <div className="flex items-center gap-3 text-xs text-rms-text0">
                  {activeConversation.contact_email && (
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {activeConversation.contact_email}</span>
                  )}
                  {activeConversation.contact_phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {activeConversation.contact_phone}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[500px] overflow-y-auto px-5 py-4 space-y-4">
            {activeConversation.messages.map((msg: ConversationMessage) => (
              <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-lg px-4 py-3",
                  msg.direction === "outbound"
                    ? "bg-brand-500/10 border border-brand-500/20"
                    : "bg-rms-raised border border-rms-border"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.type === "email" ? (
                      <Mail className="h-3 w-3 text-brand-600" />
                    ) : (
                      <MessageSquare className="h-3 w-3 text-purple-400" />
                    )}
                    <span className="text-[10px] text-rms-text0 uppercase tracking-wider">
                      {msg.direction === "outbound" ? "You" : msg.type}
                    </span>
                    <span className="text-[10px] text-rms-text-secondary">{formatDateTime(msg.created_at)}</span>
                  </div>
                  {msg.subject && (
                    <p className="text-sm font-medium text-rms-text-secondary mb-1">{msg.subject}</p>
                  )}
                  <p className="text-sm text-rms-text-secondary whitespace-pre-wrap">{msg.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply */}
          <div className="border-t border-rms-border px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={() => { setReplyType("email"); setReplyTo(activeConversation.contact_email || ""); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  replyType === "email" ? "bg-brand-500/10 text-brand-500 border border-brand-500/30" : "border border-rms-border text-rms-text-secondary hover:text-rms-text"
                )}
              >
                <Mail className="h-3 w-3" /> Reply via Email
              </button>
              <button
                onClick={() => { setReplyType("sms"); setReplyTo(activeConversation.contact_phone || ""); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  replyType === "sms" ? "bg-purple-500/10 text-purple-400 border border-purple-500/30" : "border border-rms-border text-rms-text-secondary hover:text-rms-text"
                )}
              >
                <MessageSquare className="h-3 w-3" /> Reply via SMS
              </button>
            </div>

            {replyType === "email" && (
              <input
                type="text"
                placeholder="Subject"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                className="mb-2 w-full rounded-lg border border-rms-border bg-rms-raised px-4 py-2 text-sm text-rms-text placeholder-rms-text0 focus:border-brand-500 focus:outline-none"
              />
            )}

            <div className="flex gap-2">
              <textarea
                placeholder={replyType === "email" ? "Type your reply..." : "Type your SMS message..."}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={3}
                className="flex-1 rounded-lg border border-rms-border bg-rms-raised px-4 py-2.5 text-sm text-rms-text placeholder-rms-text0 focus:border-brand-500 focus:outline-none resize-none"
              />
              <button
                onClick={() => {
                  if (!replyBody.trim() || !replyTo) return;
                  setSendingReply(true);
                  sendReplyMutation.mutate(undefined, { onSettled: () => setSendingReply(false) });
                }}
                disabled={!replyBody.trim() || !replyTo || sendingReply || (replyType === "sms" && !gatewayStatus?.connected)}
                className="flex items-center gap-2 self-end rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sendingReply ? "Sending..." : "Send"}
              </button>
            </div>

            {replyType === "sms" && !gatewayStatus?.connected && (
              <p className="mt-2 text-xs text-red-400">SMS gateway is offline. Cannot send SMS.</p>
            )}

            {/* Quick templates */}
            {replyType === "email" && emailTemplates && emailTemplates.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-rms-text0 mb-1.5">Quick templates:</p>
                <div className="flex flex-wrap gap-1.5">
                  {emailTemplates.map((t: EmailTemplate) => (
                    <button
                      key={t.id}
                      onClick={() => { setReplySubject(t.subject); setReplyBody(t.body); }}
                      className="rounded border border-rms-border px-2 py-1 text-[10px] text-rms-text-secondary hover:border-brand-500 hover:text-brand-600 transition"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {replyType === "sms" && smsTemplates && smsTemplates.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-rms-text0 mb-1.5">Quick templates:</p>
                <div className="flex flex-wrap gap-1.5">
                  {smsTemplates.map((t: SmsTemplate) => (
                    <button
                      key={t.id}
                      onClick={() => setReplyBody(t.body)}
                      className="rounded border border-rms-border px-2 py-1 text-[10px] text-rms-text-secondary hover:border-brand-500 hover:text-brand-600 transition"
                    >
                      {t.name}
                    </button>
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

