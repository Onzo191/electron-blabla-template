export const agentKeys = {
  all: ["agents"] as const,
  defaultAgent: () => [...agentKeys.all, "default"] as const,
  lists: () => [...agentKeys.all, "list"] as const,
  basicInfo: (agentId: string) =>
    [...agentKeys.all, "basic-info", agentId] as const,
};
