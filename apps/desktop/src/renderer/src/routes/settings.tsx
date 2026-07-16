import { useAppStore } from "@renderer/store/useAppStore";
import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Settings is now a dialog over /chat (features/settings), not a route of
 * its own. This stub keeps old links/bookmarks to /settings working.
 */
export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    useAppStore.getState().openSettings();
    throw redirect({ to: "/chat" });
  },
});
