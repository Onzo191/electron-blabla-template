import { useQuery } from "@tanstack/react-query";
import { getAppVersion } from "../api/app-info";
import { settingsKeys } from "../api/keys";

/** Never changes during a session; fetch once and keep it cached. */
export function useAppVersion() {
  return useQuery({
    queryKey: settingsKeys.appVersion(),
    queryFn: getAppVersion,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
