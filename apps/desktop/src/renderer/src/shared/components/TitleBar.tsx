import { GhostIconButton } from "@renderer/shared/components/GhostIconButton";
import { useAppStore } from "@renderer/store/useAppStore";
import { PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Frameless-window chrome: a full-width drag strip that hosts the sidebar
 * toggle. macOS traffic lights are inset into its left edge (see
 * BrowserWindow's `trafficLightPosition` in main/index.ts); Windows draws
 * its caption-button overlay over its right edge. Interactive children opt
 * out of the drag region individually.
 */
export function TitleBar(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const isDarwin = window.api?.platform === "darwin";

  return (
    <div
      className={`titlebar-drag flex h-titlebar w-full shrink-0 items-center border-b border-border-subtle bg-surface-100 ${
        isDarwin ? "pl-20" : "pl-2"
      }`}
    >
      <GhostIconButton
        className="titlebar-no-drag"
        aria-label={
          sidebarOpen
            ? t("actions.collapseSidebar")
            : t("actions.expandSidebar")
        }
        onClick={toggleSidebar}
      >
        <PanelLeft size={16} />
      </GhostIconButton>
    </div>
  );
}
