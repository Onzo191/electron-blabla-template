import { QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "../shared/lib/api-client";
import { logger } from "../shared/lib/logger";

const NO_RETRY_CODES = new Set(["UNAUTHORIZED", "FORBIDDEN", "VALIDATION"]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        error instanceof ApiError && NO_RETRY_CODES.has(error.code)
          ? false
          : failureCount < 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      logger.error(`query failed: ${query.queryHash}`, error);
    },
  }),
});
