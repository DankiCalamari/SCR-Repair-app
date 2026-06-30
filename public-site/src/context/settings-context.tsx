import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getPublicSettings, type SettingsMap } from "../api/settings";

interface SettingsContextValue {
  settings: SettingsMap;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({ settings: {}, loading: true });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPublicSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  return useContext(SettingsContext);
}
