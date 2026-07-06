import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  fetchAgentBasicInfo,
  fetchAgentsPage,
  fetchDefaultAgent,
} from "./agents";
import { agentKeys } from "./keys";

const AGENT_STALE_TIME_MS = 5 * 60_000;

export function defaultAgentOptions() {
  return queryOptions({
    queryKey: agentKeys.defaultAgent(),
    queryFn: fetchDefaultAgent,
    staleTime: AGENT_STALE_TIME_MS,
  });
}

export function agentListInfiniteOptions() {
  return infiniteQueryOptions({
    queryKey: agentKeys.lists(),
    queryFn: ({ pageParam }) => fetchAgentsPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: AGENT_STALE_TIME_MS,
  });
}

export function agentBasicInfoOptions(agentId: string) {
  return queryOptions({
    queryKey: agentKeys.basicInfo(agentId),
    queryFn: () => fetchAgentBasicInfo(agentId),
    staleTime: AGENT_STALE_TIME_MS,
  });
}
