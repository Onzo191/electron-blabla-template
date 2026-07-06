import {
  type AgentBasicInfo,
  type AgentDetail,
  type AgentSummary,
  agentBasicInfoResponseSchema,
  agentListResponseSchema,
  defaultAgentResponseSchema,
  type Paginated,
} from "@myvng/shared";
import { apiGet } from "@renderer/shared/lib/api-client";

export const AGENTS_PAGE_SIZE = 20;

export async function fetchDefaultAgent(): Promise<AgentDetail | null> {
  const response = await apiGet(
    "/v2/api/agent/end-user/default",
    defaultAgentResponseSchema,
  );
  return response.data[0] ?? null;
}

export async function fetchAgentsPage(
  page: number,
): Promise<Paginated<AgentSummary>> {
  const response = await apiGet(
    "/v2/api/agent/end-user",
    agentListResponseSchema,
    {
      searchParams: { page, size: AGENTS_PAGE_SIZE },
    },
  );
  return response.data;
}

export async function fetchAgentBasicInfo(
  agentId: string,
): Promise<AgentBasicInfo> {
  const response = await apiGet(
    `/v2/api/agent/${encodeURIComponent(agentId)}/basic-info`,
    agentBasicInfoResponseSchema,
  );
  return response.data;
}
