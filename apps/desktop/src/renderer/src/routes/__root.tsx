import { UpdateNotifications } from "@renderer/features/updates";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

export type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout(): React.JSX.Element {
  return (
    <div className="flex h-full w-full overflow-hidden bg-surface text-text">
      <UpdateNotifications />
      <Outlet />
    </div>
  );
}
