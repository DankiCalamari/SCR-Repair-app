export interface SettingsMap {
  [key: string]: string;
}

export async function getPublicSettings(): Promise<SettingsMap> {
  const res = await fetch("/api/v1/public/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  const data = await res.json();
  const map: SettingsMap = {};
  for (const item of data.data as { key: string; value: string | null }[]) {
    if (item.value) {
      map[item.key] = item.value;
    }
  }
  return map;
}
