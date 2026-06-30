import { useEffect } from "react";

export function useFavicon(url: string | undefined) {
  useEffect(() => {
    if (!url) return;
    let link = document.querySelector<HTMLLinkElement>("#favicon");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [url]);
}
