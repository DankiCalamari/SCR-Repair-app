import apiClient from "./client";
import type {
  Quote,
  CreateQuoteRequest,
  UpdateQuoteRequest,
  ApproveQuoteRequest,
  PaginatedResponse,
} from "../types";

export async function listQuotes(
  skip?: number,
  limit?: number,
  status?: string,
): Promise<PaginatedResponse<Quote>> {
  const params: Record<string, string | number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (status !== undefined) params.status = status;
  const { data } = await apiClient.get("/quotes", { params });
  return data;
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await apiClient.get(`/quotes/${id}`);
  return data;
}

export async function createQuote(quoteData: CreateQuoteRequest): Promise<Quote> {
  const { data } = await apiClient.post("/quotes", quoteData);
  return data;
}

export async function updateQuote(id: string, quoteData: UpdateQuoteRequest): Promise<Quote> {
  const { data } = await apiClient.put(`/quotes/${id}`, quoteData);
  return data;
}

export async function approveQuote(id: string, approvalData: ApproveQuoteRequest): Promise<Quote> {
  const { data } = await apiClient.post(`/quotes/${id}/approve`, approvalData);
  return data;
}

export async function declineQuote(id: string, declineData: ApproveQuoteRequest): Promise<Quote> {
  const { data } = await apiClient.post(`/quotes/${id}/decline`, declineData);
  return data;
}

export async function sendQuote(id: string): Promise<Quote> {
  const { data } = await apiClient.post(`/quotes/${id}/send`);
  return data;
}

export async function uploadQuotePdf(id: string, file: File): Promise<Quote> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post(`/quotes/${id}/upload-pdf`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
