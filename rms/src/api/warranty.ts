import apiClient from "./client";
import type {
  WarrantyRecord,
  WarrantyClaim,
  WarrantyValidation,
  PaginatedResponse,
} from "../types";

export async function listWarranties(
  skip?: number,
  limit?: number,
  status?: string,
): Promise<PaginatedResponse<WarrantyRecord>> {
  const params: Record<string, string | number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (status !== undefined) params.status = status;
  const { data } = await apiClient.get("/warranties", { params });
  return data;
}

export async function getWarranty(id: string): Promise<WarrantyRecord> {
  const { data } = await apiClient.get(`/warranties/${id}`);
  return data;
}

export async function validateWarranty(warrantyNumber: string): Promise<WarrantyValidation> {
  const { data } = await apiClient.get(`/warranties/validate/${warrantyNumber}`);
  return data;
}

export async function createWarrantyClaim(
  warrantyId: string,
  claimData: { description: string },
): Promise<WarrantyClaim> {
  const { data } = await apiClient.post(`/warranties/${warrantyId}/claims`, claimData);
  return data;
}

export async function resolveWarrantyClaim(
  warrantyId: string,
  claimId: string,
  resolutionData: { status: string; resolution_notes?: string | null },
): Promise<WarrantyClaim> {
  const { data } = await apiClient.put(
    `/warranties/${warrantyId}/claims/${claimId}`,
    resolutionData,
  );
  return data;
}
