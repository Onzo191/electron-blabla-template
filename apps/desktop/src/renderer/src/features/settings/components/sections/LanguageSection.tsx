import { SUPPORTED_LANGUAGES } from "@renderer/i18n";
import { SegmentedControl } from "@renderer/shared/components/SegmentedControl";
import { useAppStore } from "@renderer/store/useAppStore";
import { useTranslation } from "react-i18next";
import { SettingsRow } from "../SettingsRow";

const LANGUAGE_LABELS: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
  vi: "Tiếng Việt",
  en: "English",
};

export function LanguageSection(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  return (
    <div className="flex flex-col divide-y divide-border-subtle">
      <SettingsRow
        label={t("settings.language.label")}
        description={t("settings.language.description")}
      >
        <SegmentedControl
          value={language}
          onChange={setLanguage}
          items={SUPPORTED_LANGUAGES.map((option) => ({
            value: option,
            label: LANGUAGE_LABELS[option],
          }))}
          aria-label={t("settings.language.label")}
        />
      </SettingsRow>
    </div>
  );
}
