import { Button } from "@chakra-ui/react";
import type { SettingsSection } from "@renderer/store/slices/uiSlice";
import { CircleUser, Globe, Info, Palette, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

const SECTIONS: Array<{
  value: SettingsSection;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { value: "appearance", icon: Palette },
  { value: "language", icon: Globe },
  { value: "account", icon: CircleUser },
  { value: "updates", icon: RefreshCw },
  { value: "about", icon: Info },
];

export function SettingsNav({
  active,
  onSelect,
}: {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");

  return (
    <nav
      aria-label={t("settings.title")}
      className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border-subtle p-2"
    >
      {SECTIONS.map(({ value, icon: Icon }) => (
        <Button
          key={value}
          size="sm"
          justifyContent="flex-start"
          variant="ghost"
          bg={active === value ? "accentSubtle" : undefined}
          color={active === value ? "accent" : "textMuted"}
          _hover={{ bg: active === value ? "accentSubtle" : "surface.200" }}
          onClick={() => onSelect(value)}
        >
          <Icon size={15} />
          {t(`settings.nav.${value}`)}
        </Button>
      ))}
    </nav>
  );
}
