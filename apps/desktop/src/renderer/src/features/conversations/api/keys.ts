export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  list: (search: string) => [...conversationKeys.lists(), { search }] as const,
  pinned: () => [...conversationKeys.all, "pinned"] as const,
};
