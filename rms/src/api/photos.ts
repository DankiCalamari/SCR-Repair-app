import apiClient from "./client";
import type { Photo, PhotoCategory, PhotoUpdateRequest, PhotoCategoryCount } from "../types";

const BASE = "/photos";

export async function uploadPhoto(
  file: File,
  options?: {
    repairId?: string;
    deviceId?: string;
    customerId?: string;
    category?: PhotoCategory;
    notes?: string;
    tags?: string;
  },
): Promise<Photo> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.repairId !== undefined) formData.append("repair_id", options.repairId);
  if (options?.deviceId !== undefined) formData.append("device_id", options.deviceId);
  if (options?.customerId !== undefined) formData.append("customer_id", options.customerId);
  if (options?.category !== undefined) formData.append("category", options.category);
  if (options?.notes !== undefined) formData.append("notes", options.notes);
  if (options?.tags !== undefined) formData.append("tags", options.tags);
  const { data } = await apiClient.post(`${BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadMultiplePhotos(
  files: File[],
  options?: {
    repairId?: string;
    deviceId?: string;
    customerId?: string;
    category?: PhotoCategory;
    notes?: string;
    tags?: string;
  },
): Promise<Photo[]> {
  const results: Photo[] = [];
  for (const file of files) {
    const photo = await uploadPhoto(file, options);
    results.push(photo);
  }
  return results;
}

export async function getPhoto(id: string): Promise<Photo> {
  const { data } = await apiClient.get(`${BASE}/${id}`);
  return data;
}

export async function updatePhoto(id: string, update: PhotoUpdateRequest): Promise<Photo> {
  const { data } = await apiClient.put(`${BASE}/${id}`, update);
  return data;
}

export async function deletePhoto(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function listPhotos(params?: {
  repairId?: string;
  deviceId?: string;
  customerId?: string;
  category?: PhotoCategory;
}): Promise<Photo[]> {
  const { data } = await apiClient.get(BASE, {
    params: {
      repair_id: params?.repairId,
      device_id: params?.deviceId,
      customer_id: params?.customerId,
      category: params?.category,
    },
  });
  return data;
}

export async function downloadPhoto(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`${BASE}/${id}/download`, {
    responseType: "blob",
  });
  return data;
}

export function getPhotoUrl(photo: Photo, variant: "original" | "medium" | "thumbnail" = "original"): string {
  const path = variant === "thumbnail"
    ? photo.thumbnail_path
    : variant === "medium"
      ? photo.medium_path
      : photo.file_path;
  if (!path) return "";
  // The backend serves uploads at /uploads/<path>
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}/uploads/${path}`;
}

export async function getPhotoCategories(): Promise<PhotoCategory[]> {
  const { data } = await apiClient.get(`${BASE}/meta/categories`);
  return data;
}

export async function getPhotoCategoryCounts(params?: {
  repairId?: string;
  deviceId?: string;
  customerId?: string;
}): Promise<PhotoCategoryCount[]> {
  const { data } = await apiClient.get(`${BASE}/meta/counts`, {
    params: {
      repair_id: params?.repairId,
      device_id: params?.deviceId,
      customer_id: params?.customerId,
    },
  });
  return data;
}
