import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import { queryClient } from "./queryClient";

// The renderer loads from a `file://` URL in production, where there is no
// server to resolve pathname-based routes — hash history is required.
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  // Route loaders warm this cache (ensure/prefetch) via typed context.
  context: { queryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
