import apiClient from "./client";
import type {
  Lead,
  CreateLeadRequest,
  UpdateLeadRequest,
  PaginatedResponse,
} from "../types";

export async function listLeads(
  skip?: number,
  limit?: number,
  status?: string,
): Promise<PaginatedResponse<Lead>> {
  const params: Record<string, string | number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (status !== undefined) params.status = status;
  const { data } = await apiClient.get("/leads", { params });
  return data;
}

export async function getLead(id: string): Promise<Lead> {
  const { data } = await apiClient.get(`/leads/${id}`);
  return data;
}

export async function createLead(leadData: CreateLeadRequest): Promise<Lead> {
  const { data } = await apiClient.post("/leads", leadData);
  return data;
}

export async function updateLead(id: string, leadData: UpdateLeadRequest): Promise<Lead> {
  const { data } = await apiClient.put(`/leads/${id}`, leadData);
  return data;
}

export async function convertLead(id: string): Promise<Lead> {
  const { data } = await apiClient.post(`/leads/${id}/convert`);
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  await apiClient.delete(`/leads/${id}`);
}
