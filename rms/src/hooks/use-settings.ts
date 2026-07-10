import { useQuery } from "@tanstack/react-query";
import { getSettings, getPublicSettings } from "../api/system-settings";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ["public-settings"],
    queryFn: () => getPublicSettings(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}