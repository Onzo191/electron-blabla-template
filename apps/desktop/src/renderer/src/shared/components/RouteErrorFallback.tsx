import { Button } from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";
import { toAppError } from "../lib/error";
import { logger } from "../lib/logger";

/**
 * Router-level safety net: a route `loader` that throws is caught by
 * TanStack Router before the component tree (and its React ErrorBoundary)
 * ever mounts, so a raw loader error would otherwise blank the whole
 * window with no navigation. This gives the same friendly, on-brand
 * fallback as ErrorBoundary, plus a path back to Settings since most
 * loader failures here are auth-related.
 */
export function RouteErrorFallback({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}): React.JSX.Element {
  const appError = toAppError(error);
  logger.error(appError.message, appError.cause);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div
        role="alert"
        className="max-w-md rounded-lg border border-border-subtle bg-surface-raised p-6 text-center"
      >
        <p className="mb-2 text-sm font-medium">Something went wrong.</p>
        <p className="mb-4 text-sm text-text-muted">{appError.message}</p>
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button size="sm" asChild>
            <Link to="/settings">Go to Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
