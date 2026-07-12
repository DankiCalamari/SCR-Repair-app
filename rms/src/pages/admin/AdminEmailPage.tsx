import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listEmails, sendEmail, getEmailServiceStatus, testEmailConnections, syncEmails, getEmailTemplates } from "../../api/email";
import { formatDateTime, cn } from "../../lib/utils";
import type { EmailMessage, EmailTemplate } from "../../types";
import type { EmailConnectionTestResult } from "../../api/email";
import { Send, Mail, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle, FileText, Eye, X, AlertCircle } from "lucide-react";

type Tab = "messages" | "templates";

export default function AdminEmailPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("messages");
  const [page, setPage] = useState(0);
  const [toAddress, setToAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testResults, setTestResults] = useState<{ smtp: EmailConnectionTestResult; imap: EmailConnectionTestResult } | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-email", page],
    queryFn: () => listEmails(page * pageSize, pageSize),
    refetchInterval: 30000,
  });

  const { data: serviceStatus, isFetching: isFetchingStatus } = useQuery({
    queryKey: ["email-service-status"],
    queryFn: getEmailServiceStatus,
    refetchInterval: 30000,
  });

  const { data: templates, isError: emailTemplatesError, error: emailTemplatesErrorMsg, isFetching: isFetchingTemplates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendEmail({ to_address: toAddress, subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-email"] });
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      setToAddress("");
      setSubject("");
      setBody("");
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to send email: ${message || "Unknown error"}`);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => testEmailConnections(),
    onSuccess: (results) => {
      setTestResults(results);
      queryClient.invalidateQueries({ queryKey: ["email-service-status"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => syncEmails(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-email"] }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-rms-text">Email</h1>
          <p className="mt-1 text-sm text-rms-text-secondary">Send and track email messages</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["email-service-status"] })}
          disabled={isFetchingStatus}
          className="flex items-center gap-2 rounded-lg border border-rms-border bg-rms-surface px-3 py-2 text-sm text-rms-text hover:bg-rms-raised disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isFetchingStatus && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Service Status */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-rms-border bg-rms-surface p-4">
          <div className="flex items-center gap-3">
            {serviceStatus?.smtp_configured ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <p className="text-sm text-rms-text-secondary">SMTP</p>
              <p className={cn("font-semibold", serviceStatus?.smtp_configured ? "text-green-400" : "text-red-400")}>
                {serviceStatus?.smtp_configured ? "Configured" : "Not Configured"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-rms-border bg-rms-surface p-4">
          <div className="flex items-center gap-3">
            {serviceStatus?.imap_configured ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <p className="text-sm text-rms-text-secondary">IMAP</p>
              <p className={cn("font-semibold", serviceStatus?.imap_configured ? "text-green-400" : "text-red-400")}>
                {serviceStatus?.imap_configured ? "Configured" : "Not Configured"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 rounded-lg border border-rms-border bg-rms-surface p-4">
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-rms-border px-3 py-1.5 text-xs text-rms-text hover:bg-rms-raised"
          >
            Test Connections
          </button>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-rms-border px-3 py-1.5 text-xs text-rms-text hover:bg-rms-raised"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sync
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="mb-6 rounded-lg border border-rms-border bg-rms-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-rms-text">Test Results</h3>
            <button onClick={() => setTestResults(null)} className="text-rms-text-secondary hover:text-rms-text">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn(
              "rounded-lg border p-3",
              testResults.smtp.success
                ? "border-green-500/20 bg-green-500/5"
                : "border-red-500/20 bg-red-500/5"
            )}>
              <div className="flex items-center gap-2">
                {testResults.smtp.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className={cn("text-sm font-semibold", testResults.smtp.success ? "text-green-400" : "text-red-400")}>
                  SMTP
                </span>
              </div>
              <p className="mt-1 text-xs text-rms-text-secondary">{testResults.smtp.message}</p>
              {testResults.smtp.host && (
                <p className="mt-0.5 text-xs text-rms-text0">{testResults.smtp.host}:{testResults.smtp.port}</p>
              )}
            </div>
            <div className={cn(
              "rounded-lg border p-3",
              testResults.imap.success
                ? "border-green-500/20 bg-green-500/5"
                : "border-red-500/20 bg-red-500/5"
            )}>
              <div className="flex items-center gap-2">
                {testResults.imap.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className={cn("text-sm font-semibold", testResults.imap.success ? "text-green-400" : "text-red-400")}>
                  IMAP
                </span>
              </div>
              <p className="mt-1 text-xs text-rms-text-secondary">{testResults.imap.message}</p>
              {testResults.imap.host && (
                <p className="mt-0.5 text-xs text-rms-text0">{testResults.imap.host}:{testResults.imap.port}</p>
              )}
            </div>
          </div>
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
          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden xs:inline">Messages</span><span className="xs:hidden">Mail</span>
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
        <>
          {/* Send Email */}
          <div className="mb-6 rounded-lg border border-rms-border bg-rms-surface p-5">
            <h2 className="mb-4 font-heading text-lg font-semibold text-rms-text">Send Email</h2>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="To email address"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="w-full rounded-lg border border-rms-border bg-rms-raised px-4 py-2.5 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-rms-border bg-rms-raised px-4 py-2.5 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
              />
              <textarea
                placeholder="Message body..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-rms-border bg-rms-raised px-4 py-2.5 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !toAddress || !subject || !body}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send Email
              </button>
            </div>
          </div>

          {/* Email History */}
          <div className="rounded-lg border border-rms-border bg-rms-surface">
            <div className="border-b border-rms-border px-5 py-4">
              <h2 className="font-heading text-lg font-semibold text-rms-text">Email History</h2>
            </div>
            <div className="divide-y divide-rms-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse px-5 py-4">
                    <div className="h-4 w-40 rounded bg-rms-raised" />
                    <div className="mt-2 h-3 w-56 rounded bg-rms-raised" />
                  </div>
                ))
              ) : data?.data?.length === 0 ? (
                <div className="px-5 py-12 text-center text-rms-text-secondary">No emails yet</div>
              ) : (
                data?.data?.map((email: EmailMessage) => (
                  <div key={email.id} className="flex items-start gap-4 px-5 py-4">
                    <div className={cn(
                      "mt-0.5 rounded-full p-2",
                      email.direction === "outbound" ? "bg-brand-500/10" : "bg-rms-raised"
                    )}>
                      <Mail className={cn(
                        "h-4 w-4",
                        email.direction === "outbound" ? "text-brand-500" : "text-rms-text-secondary"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-rms-text truncate">{email.subject}</span>
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-xs shrink-0",
                          email.status === "sent" ? "bg-green-500/5 text-green-400" :
                          email.status === "failed" ? "bg-red-500/5 text-red-400" :
                          "bg-yellow-500/5 text-yellow-400"
                        )}>
                          {email.status}
                        </span>
                      </div>
                      <p className="text-xs text-rms-text-secondary">
                        {email.direction === "outbound" ? `To: ${email.to_address}` : `From: ${email.from_address}`}
                      </p>
                      <p className="mt-1 text-sm text-rms-text-secondary truncate">{email.body}</p>
                      <p className="mt-1 text-xs text-rms-text0">{formatDateTime(email.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-rms-text-secondary">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 rounded-lg border border-rms-border px-3 py-2 text-sm text-rms-text hover:bg-rms-raised disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 rounded-lg border border-rms-border px-3 py-2 text-sm text-rms-text hover:bg-rms-raised disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "templates" && (
        <div className="rounded-lg border border-rms-border bg-rms-surface">
          <div className="border-b border-rms-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-rms-text">Email Templates</h2>
            <p className="mt-1 text-sm text-rms-text-secondary">
              Pre-defined email templates with {"{{variable}}"} placeholders. Use them from the repair detail page.
            </p>
          </div>
          {isFetchingTemplates ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto h-12 w-12 animate-pulse rounded bg-rms-raised" />
              <p className="mt-4 text-rms-text-secondary">Loading templates...</p>
            </div>
          ) : emailTemplatesError ? (
            <div className="px-5 py-16 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <p className="mt-4 text-red-400">Failed to load templates</p>
              <p className="mt-1 text-xs text-rms-text0">{(emailTemplatesErrorMsg as Error)?.message || "Unknown error"}</p>
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
                      <p className="text-sm text-rms-text-secondary">Subject: {t.subject}</p>
                      <p className="mt-1 text-sm text-rms-text-secondary line-clamp-2">{t.body}</p>
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
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg border border-rms-border bg-rms-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-rms-text">{previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-rms-text-secondary hover:text-rms-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3">
              <p className="text-xs font-medium text-rms-text-secondary mb-1">Subject</p>
              <p className="text-sm text-rms-text font-mono bg-rms-surface rounded px-3 py-2">{previewTemplate.subject}</p>
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium text-rms-text-secondary mb-1">Body</p>
              <div className="rounded-lg bg-rms-surface p-4">
                <p className="text-sm text-rms-text-secondary whitespace-pre-wrap">{previewTemplate.body}</p>
              </div>
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

