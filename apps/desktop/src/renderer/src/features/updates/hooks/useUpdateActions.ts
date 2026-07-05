import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateKeys } from "../api/keys";
import {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
} from "../api/updates";

/** Mutations that drive the direct-channel updater; all refresh the polled status on settle. */
export function useUpdateActions() {
  const queryClient = useQueryClient();
  const invalidateStatus = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: updateKeys.status() });

  const check = useMutation({
    mutationFn: checkForUpdates,
    onSettled: invalidateStatus,
  });
  const download = useMutation({
    mutationFn: downloadUpdate,
    onSettled: invalidateStatus,
  });
  const install = useMutation({
    mutationFn: quitAndInstall,
  });

  return { check, download, install };
}
