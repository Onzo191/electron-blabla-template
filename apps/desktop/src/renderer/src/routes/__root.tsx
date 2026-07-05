import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { UpdateNotifications } from "../features/updates";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout(): React.JSX.Element {
  return (
    <div className="flex h-full w-full overflow-hidden bg-surface text-text">
      <UpdateNotifications />
      <nav
        aria-label="Primary"
        className="flex w-56 shrink-0 flex-col gap-1 border-r border-surface-200 bg-surface-100 p-3"
      >
        <Link
          to="/"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-200"
          activeProps={{ className: "bg-surface-200" }}
        >
          Conversations
        </Link>
        <Link
          to="/settings"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-200"
          activeProps={{ className: "bg-surface-200" }}
        >
          Settings
        </Link>
      </nav>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
