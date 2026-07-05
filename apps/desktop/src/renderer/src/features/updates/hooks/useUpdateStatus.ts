import { useQuery } from "@tanstack/react-query";
import { updateKeys } from "../api/keys";
import { getUpdateStatus } from "../api/updates";

const POLL_INTERVAL_MS = 2_000;

/** Polls the main process's in-memory updater status (cheap local IPC, no network). */
export function useUpdateStatus() {
  return useQuery({
    queryKey: updateKeys.status(),
    queryFn: getUpdateStatus,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });
}
