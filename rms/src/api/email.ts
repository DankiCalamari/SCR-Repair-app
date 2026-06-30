import apiClient from "./client";
import type {
  EmailMessage,
  EmailTemplate,
  EmailTemplateSendRequest,
  SendEmailRequest,
  EmailServiceStatus,
  PaginatedResponse,
} from "../types";

export async function listEmails(
  skip?: number,
  limit?: number,
  repairId?: string,
  customerId?: string,
  direction?: string,
  unassigned?: boolean,
): Promise<PaginatedResponse<EmailMessage>> {
  const params: Record<string, string | number | boolean> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (repairId !== undefined) params.repair_id = repairId;
  if (customerId !== undefined) params.customer_id = customerId;
  if (direction !== undefined) params.direction = direction;
  if (unassigned !== undefined) params.unassigned = unassigned;
  const { data } = await apiClient.get("/email/", { params });
  return data;
}

export async function assignEmailToRepair(emailId: string, repairId: string): Promise<EmailMessage> {
  const { data } = await apiClient.post(`/email/${emailId}/assign?repair_id=${repairId}`);
  return data;
}

export async function sendEmail(emailData: SendEmailRequest): Promise<EmailMessage> {
  const { data } = await apiClient.post("/email/send", emailData);
  return data;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const { data } = await apiClient.get("/email/templates");
  return data;
}

export async function sendEmailTemplate(data: EmailTemplateSendRequest): Promise<EmailMessage> {
  const { data: response } = await apiClient.post("/email/send-template", data);
  return response;
}

export interface EmailConnectionTestResult {
  success: boolean;
  message: string;
  host: string | null;
  port: number | null;
}

export async function testEmailConnections(): Promise<{
  smtp: EmailConnectionTestResult;
  imap: EmailConnectionTestResult;
}> {
  const { data } = await apiClient.post("/email/test");
  return data;
}

export async function getEmailServiceStatus(): Promise<EmailServiceStatus> {
  const { data } = await apiClient.get("/email/status");
  return data;
}

export async function syncEmails(): Promise<{ synced: number }> {
  const { data } = await apiClient.post("/email/sync");
  return data;
}
