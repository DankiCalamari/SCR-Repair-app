import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../api/system-settings";

export function useSettings() {
  return useQuery({ queryKey: ["app-settings"], queryFn: getPublicSettings });
}
