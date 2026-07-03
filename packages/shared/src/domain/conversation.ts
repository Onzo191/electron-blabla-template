import { z } from "zod";

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const conversationsResponseSchema = z.array(conversationSchema);
