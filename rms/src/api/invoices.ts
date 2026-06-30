import apiClient from "./client";
import type {
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  MarkInvoicePaidRequest,
  PaginatedResponse,
} from "../types";

export async function listInvoices(
  skip?: number,
  limit?: number,
  status?: string,
): Promise<PaginatedResponse<Invoice>> {
  const params: Record<string, string | number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (status !== undefined) params.status = status;
  const { data } = await apiClient.get("/invoices", { params });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get(`/invoices/${id}`);
  return data;
}

export async function createInvoice(invoiceData: CreateInvoiceRequest): Promise<Invoice> {
  const { data } = await apiClient.post("/invoices", invoiceData);
  return data;
}

export async function updateInvoice(id: string, invoiceData: UpdateInvoiceRequest): Promise<Invoice> {
  const { data } = await apiClient.put(`/invoices/${id}`, invoiceData);
  return data;
}

export async function markInvoicePaid(id: string, paidData: MarkInvoicePaidRequest): Promise<Invoice> {
  const { data } = await apiClient.post(`/invoices/${id}/mark-paid`, paidData);
  return data;
}

export async function sendInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.post(`/invoices/${id}/send`);
  return data;
}

export async function uploadInvoicePdf(id: string, file: File): Promise<Invoice> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post(`/invoices/${id}/upload-pdf`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
