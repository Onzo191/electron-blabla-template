import { useState } from "react";
import { useUpdateActions } from "../hooks/useUpdateActions";
import { useUpdateStatus } from "../hooks/useUpdateStatus";
import { ForcedUpdateDialog } from "./ForcedUpdateDialog";
import { UpdateBanner } from "./UpdateBanner";

/**
 * Mounted once at the app shell. Store builds (mas/appx) never register
 * the underlying IPC channels, so the status query stays empty there and
 * this renders nothing — the store owns update UX for those builds.
 */
export function UpdateNotifications(): React.JSX.Element | null {
  const { data: status } = useUpdateStatus();
  const { download, install } = useUpdateActions();
  const [dismissed, setDismissed] = useState(false);
  const isBusy = download.isPending || install.isPending;

  if (!status) return null;

  const applyUpdate = (): void => {
    if (status.state === "downloaded") {
      install.mutate();
    } else {
      download.mutate();
    }
  };

  if (status.isForced) {
    return (
      <ForcedUpdateDialog
        status={status}
        isBusy={isBusy}
        onUpdateNow={applyUpdate}
      />
    );
  }

  if (dismissed) return null;

  if (status.state === "available" || status.state === "downloaded") {
    return (
      <UpdateBanner
        status={status}
        isBusy={isBusy}
        onUpdate={applyUpdate}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  return null;
}
