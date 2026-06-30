import apiClient from "./client";
import type {
  Repair,
  RepairDetail,
  CreateRepairRequest,
  UpdateRepairRequest,
  UpdateRepairStatusRequest,
  RepairTimelineEntry,
  Photo,
  Document,
  PaginatedResponse,
} from "../types";

export async function listRepairs(
  skip?: number,
  limit?: number,
  status?: string,
  search?: string,
): Promise<PaginatedResponse<Repair>> {
  const params: Record<string, string | number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (status !== undefined) params.status = status;
  if (search !== undefined) params.search = search;
  const { data } = await apiClient.get("/repairs", { params });
  return data;
}

export async function getRepair(id: string): Promise<RepairDetail> {
  const { data } = await apiClient.get(`/repairs/${id}`);
  return data;
}

export async function createRepair(repairData: CreateRepairRequest): Promise<Repair> {
  const { data } = await apiClient.post("/repairs", repairData);
  return data;
}

export async function updateRepair(id: string, repairData: UpdateRepairRequest): Promise<Repair> {
  const { data } = await apiClient.put(`/repairs/${id}`, repairData);
  return data;
}

export async function updateRepairStatus(id: string, statusData: UpdateRepairStatusRequest): Promise<Repair> {
  const { data } = await apiClient.patch(`/repairs/${id}/status`, statusData);
  return data;
}

export async function deleteRepair(id: string): Promise<void> {
  await apiClient.delete(`/repairs/${id}`);
}

export async function getRepairTimeline(id: string): Promise<RepairTimelineEntry[]> {
  const { data } = await apiClient.get(`/repairs/${id}/timeline`);
  return data.data;
}

export async function getRepairPhotos(id: string): Promise<Photo[]> {
  const { data } = await apiClient.get(`/repairs/${id}/photos`);
  return data;
}

export async function getRepairDocuments(id: string): Promise<Document[]> {
  const { data } = await apiClient.get(`/repairs/${id}/documents`);
  return data;
}

export async function getRepairCommunications(id: string): Promise<PaginatedResponse<unknown>> {
  const { data } = await apiClient.get(`/repairs/${id}/communications`);
  return data;
}
