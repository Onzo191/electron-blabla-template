export const chatKeys = {
  all: ["messages"] as const,
  messages: (conversationId: string) =>
    [...chatKeys.all, conversationId] as const,
};
