import { useEffect } from "react";

export function useFavicon(url: string | undefined) {
  useEffect(() => {
    if (!url) return;
    // Update both the main favicon and shortcut icon
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;

    // Update shortcut icon if it exists
    const shortcutLink = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
    if (shortcutLink) {
      shortcutLink.href = url;
    }
  }, [url]);
}
