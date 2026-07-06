import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  agentBasicInfoOptions,
  agentListInfiniteOptions,
  defaultAgentOptions,
} from "../api/options";

export function useDefaultAgent() {
  return useQuery(defaultAgentOptions());
}

export function useAgentsInfinite() {
  return useInfiniteQuery({
    ...agentListInfiniteOptions(),
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}

export function useAgentBasicInfo(agentId: string | null) {
  return useQuery({
    ...agentBasicInfoOptions(agentId ?? ""),
    enabled: agentId !== null,
  });
}
