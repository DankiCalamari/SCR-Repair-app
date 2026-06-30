import apiClient from "./client";
import type { Device, CreateDeviceRequest, UpdateDeviceRequest, PaginatedResponse } from "../types";

export async function listDevices(skip?: number, limit?: number): Promise<PaginatedResponse<Device>> {
  const params: Record<string, number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  const { data } = await apiClient.get("/devices", { params });
  return data;
}

export async function getDevice(id: string): Promise<Device> {
  const { data } = await apiClient.get(`/devices/${id}`);
  return data;
}

export async function createDevice(deviceData: CreateDeviceRequest): Promise<Device> {
  const { data } = await apiClient.post("/devices", deviceData);
  return data;
}

export async function updateDevice(id: string, deviceData: UpdateDeviceRequest): Promise<Device> {
  const { data } = await apiClient.put(`/devices/${id}`, deviceData);
  return data;
}

export async function deleteDevice(id: string): Promise<void> {
  await apiClient.delete(`/devices/${id}`);
}
