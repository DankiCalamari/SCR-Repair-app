import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../api/system-settings";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}