import { Button, Spinner } from "@chakra-ui/react";
import { useUpdateActions, useUpdateStatus } from "@renderer/features/updates";
import { useTranslation } from "react-i18next";
import { useAppVersion } from "../../hooks/useAppVersion";

/**
 * Store builds (mas/appx) never register the direct-channel updater IPC, so
 * the status query settles into an error with no data — that's the signal
 * to show the "managed by the app store" message instead of controls.
 */
export function UpdatesSection(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const versionQuery = useAppVersion();
  const statusQuery = useUpdateStatus();
  const { check, download, install } = useUpdateActions();

  const isBusy = check.isPending || download.isPending || install.isPending;

  if (statusQuery.isPending) {
    return <Spinner size="sm" aria-label={t("settings.nav.updates")} />;
  }

  if (!statusQuery.data) {
    return (
      <p className="py-3 text-sm text-text-faint">
        {t("settings.updates.unavailable")}
      </p>
    );
  }

  const status = statusQuery.data;

  const statusLine = (): string => {
    switch (status.state) {
      case "checking":
        return t("settings.updates.checking");
      case "available":
        return t("settings.updates.available", {
          version: status.latestVersion ?? "",
        });
      case "downloading":
        return t("settings.updates.downloading", {
          progress: status.downloadProgress ?? 0,
        });
      case "downloaded":
        return t("settings.updates.downloaded");
      case "error":
        return t("settings.updates.error");
      default:
        return t("settings.updates.upToDate");
    }
  };

  const primaryAction = (): void => {
    if (status.state === "downloaded") {
      install.mutate();
    } else if (status.state === "available") {
      download.mutate();
    } else {
      check.mutate();
    }
  };

  const primaryLabel =
    status.state === "downloaded"
      ? t("settings.updates.restart")
      : status.state === "available"
        ? t("settings.updates.download")
        : t("settings.updates.check");

  return (
    <div className="flex flex-col gap-3 py-3">
      <p className="text-sm text-text">
        {t("settings.updates.currentVersion", {
          version: versionQuery.data?.version ?? status.currentVersion,
        })}
      </p>
      <p className="text-xs text-text-faint">{statusLine()}</p>
      <div>
        <Button size="sm" onClick={primaryAction} loading={isBusy}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
