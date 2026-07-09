import apiClient from "./client";

export interface IntegrationSettings {
  provider: string;
  is_enabled: boolean;
  webhook_url: string | null;
  last_sync_success: string | null;
  last_sync_error: string | null;
  error_message: string | null;
}

export interface SyncLog {
  id: string;
  provider: string;
  entity_type: string;
  action: string;
  status: string;
  response_status: number | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export const getIntegrationSettings = (provider: string) =>
  apiClient.get<IntegrationSettings>(`/integrations/settings/${provider}`);

export const updateIntegrationSettings = (provider: string, data: Partial<IntegrationSettings>) =>
  apiClient.put(`/integrations/settings/${provider}`, data);

export const testIntegrationConnection = (provider: string) =>
  apiClient.post<{ status: string; message: string }>(`/integrations/settings/${provider}/test`);

export const syncCustomerToHnry = (customerId: string) =>
  apiClient.post(`/integrations/customers/${customerId}/sync-client`);

export const getSyncLogs = (provider?: string, limit?: number) =>
  apiClient.get<SyncLog[]>("/integrations/sync-logs", { params: { provider, limit } });

export const retrySyncLog = (logId: string) =>
  apiClient.post(`/integrations/sync-logs/${logId}/retry`);

export async function syncInvoiceToHnry(invoiceId: string) {
  return apiClient.post(`/integrations/invoices/${invoiceId}/sync-invoice`);
}

export async function raiseExpenseToHnry(expenseData: {
  supplier: string;
  date: string;
  amount: number;
  category: string;
  notes: string;
  receipt_url?: string;
}) {
  return apiClient.post("/integrations/expenses/raise", expenseData);
}