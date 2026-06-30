import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listEmails, sendEmail, getEmailServiceStatus, testEmailConnections, syncEmails, getEmailTemplates } from "../../api/email";
import { formatDateTime, cn } from "../../lib/utils";
import type { EmailMessage, EmailTemplate } from "../../types";
import type { EmailConnectionTestResult } from "../../api/email";
import { Send, Mail, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle, FileText, Eye, X } from "lucide-react";

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
  });

  const { data: serviceStatus } = useQuery({
    queryKey: ["email-service-status"],
    queryFn: getEmailServiceStatus,
  });

  const { data: templates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendEmail({ to_address: toAddress, subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-email"] });
      setToAddress("");
      setSubject("");
      setBody("");
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
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-surface-100">Email</h1>
        <p className="mt-1 text-surface-400">Send and track email messages</p>
      </div>

      {/* Service Status */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-surface-800 bg-surface-900 p-4">
          <div className="flex items-center gap-3">
            {serviceStatus?.smtp_configured ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <p className="text-sm text-surface-400">SMTP</p>
              <p className={cn("font-semibold", serviceStatus?.smtp_configured ? "text-green-400" : "text-red-400")}>
                {serviceStatus?.smtp_configured ? "Configured" : "Not Configured"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-surface-800 bg-surface-900 p-4">
          <div className="flex items-center gap-3">
            {serviceStatus?.imap_configured ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <p className="text-sm text-surface-400">IMAP</p>
              <p className={cn("font-semibold", serviceStatus?.imap_configured ? "text-green-400" : "text-red-400")}>
                {serviceStatus?.imap_configured ? "Configured" : "Not Configured"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 rounded-lg border border-surface-800 bg-surface-900 p-4">
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-surface-700 px-3 py-1.5 text-xs text-surface-100 hover:bg-surface-800"
          >
            Test Connections
          </button>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-surface-700 px-3 py-1.5 text-xs text-surface-100 hover:bg-surface-800"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sync
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="mb-6 rounded-lg border border-surface-800 bg-surface-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-100">Test Results</h3>
            <button onClick={() => setTestResults(null)} className="text-surface-400 hover:text-surface-100">
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
              <p className="mt-1 text-xs text-surface-300">{testResults.smtp.message}</p>
              {testResults.smtp.host && (
                <p className="mt-0.5 text-xs text-surface-500">{testResults.smtp.host}:{testResults.smtp.port}</p>
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
              <p className="mt-1 text-xs text-surface-300">{testResults.imap.message}</p>
              {testResults.imap.host && (
                <p className="mt-0.5 text-xs text-surface-500">{testResults.imap.host}:{testResults.imap.port}</p>
              )}
            </div>
          </div>
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
          <Mail className="h-4 w-4" /> Messages
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
        <>
          {/* Send Email */}
          <div className="mb-6 rounded-lg border border-surface-800 bg-surface-900 p-5">
            <h2 className="mb-4 font-heading text-lg font-semibold text-surface-100">Send Email</h2>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="To email address"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
              />
              <textarea
                placeholder="Message body..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
              />
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !toAddress || !subject || !body}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 font-semibold text-surface-950 hover:bg-accent-400 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send Email
              </button>
            </div>
          </div>

          {/* Email History */}
          <div className="rounded-lg border border-surface-800 bg-surface-900">
            <div className="border-b border-surface-800 px-5 py-4">
              <h2 className="font-heading text-lg font-semibold text-surface-100">Email History</h2>
            </div>
            <div className="divide-y divide-surface-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse px-5 py-4">
                    <div className="h-4 w-40 rounded bg-surface-800" />
                    <div className="mt-2 h-3 w-56 rounded bg-surface-800" />
                  </div>
                ))
              ) : data?.data?.length === 0 ? (
                <div className="px-5 py-12 text-center text-surface-400">No emails yet</div>
              ) : (
                data?.data?.map((email: EmailMessage) => (
                  <div key={email.id} className="flex items-start gap-4 px-5 py-4">
                    <div className={cn(
                      "mt-0.5 rounded-full p-2",
                      email.direction === "outbound" ? "bg-accent-500/10" : "bg-surface-700"
                    )}>
                      <Mail className={cn(
                        "h-4 w-4",
                        email.direction === "outbound" ? "text-accent-500" : "text-surface-300"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-100 truncate">{email.subject}</span>
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-xs shrink-0",
                          email.status === "sent" ? "bg-green-500/5 text-green-400" :
                          email.status === "failed" ? "bg-red-500/5 text-red-400" :
                          "bg-yellow-500/5 text-yellow-400"
                        )}>
                          {email.status}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400">
                        {email.direction === "outbound" ? `To: ${email.to_address}` : `From: ${email.from_address}`}
                      </p>
                      <p className="mt-1 text-sm text-surface-300 truncate">{email.body}</p>
                      <p className="mt-1 text-xs text-surface-500">{formatDateTime(email.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-surface-400">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-100 hover:bg-surface-800 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-100 hover:bg-surface-800 disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "templates" && (
        <div className="rounded-lg border border-surface-800 bg-surface-900">
          <div className="border-b border-surface-800 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-surface-100">Email Templates</h2>
            <p className="mt-1 text-sm text-surface-400">
              Pre-defined email templates with {"{{variable}}"} placeholders. Use them from the repair detail page.
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
                    <p className="text-sm text-surface-400">Subject: {t.subject}</p>
                    <p className="mt-1 text-sm text-surface-300 line-clamp-2">{t.body}</p>
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
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg border border-surface-800 bg-surface-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-surface-100">{previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-surface-400 hover:text-surface-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3">
              <p className="text-xs font-medium text-surface-400 mb-1">Subject</p>
              <p className="text-sm text-surface-100 font-mono bg-surface-950 rounded px-3 py-2">{previewTemplate.subject}</p>
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium text-surface-400 mb-1">Body</p>
              <div className="rounded-lg bg-surface-950 p-4">
                <p className="text-sm text-surface-200 whitespace-pre-wrap">{previewTemplate.body}</p>
              </div>
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
