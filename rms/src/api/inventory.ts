import apiClient from "./client";
import type {
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  PaginatedResponse,
} from "../types";

export async function listInventory(
  skip?: number,
  limit?: number,
  search?: string,
  category?: string,
): Promise<PaginatedResponse<InventoryItem>> {
  const params: Record<string, string | number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (search !== undefined) params.search = search;
  if (category !== undefined) params.category = category;
  const { data } = await apiClient.get("/inventory", { params });
  return data;
}

export async function createInventoryItem(item: CreateInventoryItemRequest): Promise<InventoryItem> {
  const { data } = await apiClient.post("/inventory", item);
  return data;
}

export async function updateInventoryItem(id: string, item: UpdateInventoryItemRequest): Promise<InventoryItem> {
  const { data } = await apiClient.put(`/inventory/${id}`, item);
  return data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiClient.delete(`/inventory/${id}`);
}