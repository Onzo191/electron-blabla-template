import { Dialog, Portal } from "@chakra-ui/react";
import { DURATION } from "@renderer/shared/lib/motion";
import { useAppStore } from "@renderer/store/useAppStore";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import { SettingsNav } from "./SettingsNav";
import { AboutSection } from "./sections/AboutSection";
import { AccountSection } from "./sections/AccountSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { LanguageSection } from "./sections/LanguageSection";
import { UpdatesSection } from "./sections/UpdatesSection";

const SECTION_COMPONENTS = {
  appearance: AppearanceSection,
  language: LanguageSection,
  account: AccountSection,
  updates: UpdatesSection,
  about: AboutSection,
};

export function SettingsDialog(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const open = useAppStore((state) => state.settingsOpen);
  const section = useAppStore((state) => state.settingsSection);
  const openSettings = useAppStore((state) => state.openSettings);
  const closeSettings = useAppStore((state) => state.closeSettings);

  const ActiveSection = SECTION_COMPONENTS[section];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open: next }) => {
        if (!next) closeSettings();
      }}
      size="lg"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="2xl" maxW="42rem" overflow="hidden">
            <Dialog.Header borderBottomWidth="1px" borderColor="borderSubtle">
              <Dialog.Title>{t("settings.title")}</Dialog.Title>
            </Dialog.Header>
            <div className="flex min-h-[24rem]">
              <SettingsNav active={section} onSelect={openSettings} />
              <Dialog.Body flex="1" overflowY="auto" px="6">
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={section}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DURATION.fast }}
                  >
                    <ActiveSection />
                  </m.div>
                </AnimatePresence>
              </Dialog.Body>
            </div>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
