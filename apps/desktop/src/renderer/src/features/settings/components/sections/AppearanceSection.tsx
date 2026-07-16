import { SegmentedControl } from "@renderer/shared/components/SegmentedControl";
import type { Theme } from "@renderer/store/slices/uiSlice";
import { useAppStore } from "@renderer/store/useAppStore";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsRow } from "../SettingsRow";

export function AppearanceSection(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  const items: Array<{ value: Theme; label: React.ReactNode }> = [
    {
      value: "light",
      label: (
        <span className="flex items-center gap-1.5">
          <Sun size={14} />
          {t("settings.appearance.themeLight")}
        </span>
      ),
    },
    {
      value: "dark",
      label: (
        <span className="flex items-center gap-1.5">
          <Moon size={14} />
          {t("settings.appearance.themeDark")}
        </span>
      ),
    },
    {
      value: "system",
      label: (
        <span className="flex items-center gap-1.5">
          <Monitor size={14} />
          {t("settings.appearance.themeSystem")}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col divide-y divide-border-subtle">
      <SettingsRow
        label={t("settings.appearance.theme")}
        description={t("settings.appearance.themeDescription")}
      >
        <SegmentedControl
          value={theme}
          onChange={setTheme}
          items={items}
          aria-label={t("settings.appearance.theme")}
        />
      </SettingsRow>
    </div>
  );
}
