import apiClient from "./client";

export interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string;
}

export interface SettingsMap {
  [key: string]: string;
}

/**
 * Public settings — no authentication required.
 * Uses fetch directly to avoid auth interceptor issues.
 */
export async function getPublicSettings(): Promise<SettingsMap> {
  const response = await fetch("/api/v1/public/settings");
  if (!response.ok) throw new Error("Failed to load settings");
  const responseData = await response.json();
  const map: SettingsMap = {};
  for (const item of responseData.data as SystemSetting[]) {
    if (item.value) {
      map[item.key] = item.value;
    }
  }
  return map;
}

/**
 * Admin settings — requires admin authentication.
 * Used by admin settings page only.
 */
export async function getSettings(): Promise<SettingsMap> {
  const { data } = await apiClient.get("/admin/settings");
  const map: SettingsMap = {};
  for (const item of data.data as SystemSetting[]) {
    if (item.value) {
      map[item.key] = item.value;
    }
  }
  return map;
}

export async function updateSetting(key: string, value: string): Promise<SystemSetting> {
  const { data } = await apiClient.put(`/admin/settings?key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}`);
  return data;
}

export async function updateSettings(settings: SettingsMap): Promise<void> {
  const entries = Object.entries(settings).filter(([, v]) => v !== undefined && v !== null);
  await Promise.all(entries.map(([key, value]) => updateSetting(key, value)));
}

export async function uploadLogo(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/admin/upload-logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadAdminLogo(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/admin/upload-admin-logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadFavicon(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/admin/upload-favicon", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadEmailSignature(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/admin/upload-email-signature", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Get the configured business timezone.
 */
export async function getTimezone(): Promise<string> {
  const response = await fetch("/api/v1/public/settings/timezone");
  if (!response.ok) throw new Error("Failed to load timezone");
  return response.text();
}
