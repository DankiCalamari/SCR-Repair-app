import { useEffect } from "react";
import { useSettings } from "./use-settings";

export function useFavicon() {
  const { data: settings } = useSettings();
  useEffect(() => {
    const url = settings?.favicon_url;
    if (!url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [settings?.favicon_url]);
}
