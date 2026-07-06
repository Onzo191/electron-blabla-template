import { z } from "zod";
import { dataEnvelopeSchema, paginatedSchema } from "../api/envelope";

export const conversationSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  pinned: z.boolean().optional(),
});

export type Conversation = z.infer<typeof conversationSchema>;

/** GET v2/api/conversations and GET v2/api/conversations/pinned */
export const conversationListResponseSchema =
  paginatedSchema(conversationSchema);

/** POST v2/api/conversations/init */
export const conversationInitResponseSchema = dataEnvelopeSchema(
  z.looseObject({ id: z.string() }),
);
