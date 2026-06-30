import apiClient from "./client";
import type { Document } from "../types";

export async function getDocumentsForRepair(repairId: string): Promise<Document[]> {
  const { data } = await apiClient.get("/documents", { params: { repair_id: repairId } });
  return data;
}

export async function uploadDocument(
  repairId: string,
  documentType: string,
  file: File,
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);
  formData.append("repair_id", repairId);
  const { data } = await apiClient.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function downloadDocument(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/documents/${id}/download`, {
    responseType: "blob",
  });
  return data;
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await apiClient.get(`/documents/${id}`);
  return data;
}
