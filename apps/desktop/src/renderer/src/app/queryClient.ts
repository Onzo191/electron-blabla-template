import { QueryCache, QueryClient } from "@tanstack/react-query";
import { logger } from "../shared/lib/logger";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      logger.error(`query failed: ${query.queryHash}`, error);
    },
  }),
});
