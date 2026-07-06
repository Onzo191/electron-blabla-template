import { z } from "zod";
import {
  dataEnvelopeSchema,
  type Pagination,
  paginatedSchema,
} from "../api/envelope";

export const conversationSchema: z.ZodType<
  {
    id: string;
    name: string;
    createdAt: string;
    pinned?: boolean;
  },
  unknown
> = z
  .object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    pinned: z.boolean().optional(),
  })
  .transform((data) => ({
    id: data.id,
    name: data.name,
    createdAt: data.createdAt ?? data.updatedAt ?? new Date().toISOString(),
    pinned: data.pinned,
  }));

export type Conversation = z.infer<typeof conversationSchema>;

/** GET v2/api/conversations and GET v2/api/conversations/pinned */
export const conversationListResponseSchema: z.ZodType<
  {
    data: {
      items: Conversation[];
      pagination: Pagination;
    };
  },
  unknown
> = paginatedSchema(conversationSchema);

/** POST v2/api/conversations/init */
export const conversationInitResponseSchema = dataEnvelopeSchema(
  z.looseObject({ id: z.string() }),
);
