import {
  agentListInfiniteOptions,
  defaultAgentOptions,
} from "@renderer/features/agents";
import { ChatSidebar, ChatStreamRedirector } from "@renderer/features/chat";
import { pinnedConversationsOptions } from "@renderer/features/conversations";
import { SettingsDialog } from "@renderer/features/settings";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import { TitleBar } from "@renderer/shared/components/TitleBar";
import { useAppStore } from "@renderer/store/useAppStore";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/chat")({
  // Warm the caches the sidebar needs; loaders never own data (staleTime
  // keeps components from refetching immediately).
  loader: ({ context }) => {
    void context.queryClient.prefetchInfiniteQuery(agentListInfiniteOptions());
    void context.queryClient.prefetchQuery(pinnedConversationsOptions());
    void context.queryClient.prefetchQuery(defaultAgentOptions());
  },
  component: ChatLayout,
});

function ChatLayout(): React.JSX.Element {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const isModKey = event.metaKey || event.ctrlKey;
      if (isModKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  return (
    <div className="flex h-full w-full flex-col">
      <ChatStreamRedirector />
      <TitleBar />
      <SettingsDialog />
      <div
        className="sidebar-track grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: sidebarOpen
            ? "var(--sidebar-width) 1fr"
            : "0 1fr",
        }}
      >
        <ErrorBoundary>
          <ChatSidebar />
        </ErrorBoundary>
        <main className="flex min-w-0 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
