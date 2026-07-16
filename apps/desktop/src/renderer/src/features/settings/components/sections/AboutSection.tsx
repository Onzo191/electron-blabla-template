import { Spinner } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useAppVersion } from "../../hooks/useAppVersion";

export function AboutSection(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const { data, isPending } = useAppVersion();

  return (
    <div className="flex flex-col gap-1 py-3">
      {isPending ? (
        <Spinner size="sm" aria-label={t("settings.title")} />
      ) : data ? (
        <>
          <p className="text-sm text-text">
            {t("settings.about.version", { version: data.version })}
          </p>
          <p className="text-xs text-text-faint">
            {t("settings.about.platform", { platform: data.platform })}
          </p>
        </>
      ) : null}
    </div>
  );
}
