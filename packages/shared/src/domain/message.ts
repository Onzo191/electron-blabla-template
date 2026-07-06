import { z } from "zod";
import { paginatedSchema } from "../api/envelope";

export const messageRoleSchema = z.enum(["user", "assistant"]);

export type MessageRole = z.infer<typeof messageRoleSchema>;

export const referenceSchema = z.looseObject({
  title: z.string().nullish(),
  url: z.string().nullish(),
});

export type Reference = z.infer<typeof referenceSchema>;

export const messageFeedbackSchema = z.enum(["LIKE", "DISLIKE"]);

export type MessageFeedback = z.infer<typeof messageFeedbackSchema>;

/**
 * A persisted chat message. Field names for the history endpoint
 * (GET v2/api/conversations/:id) are not pinned by the spec — this schema is
 * the single fix point once verified against the live API.
 */
export const chatMessageSchema = z.looseObject({
  id: z.string(),
  role: messageRoleSchema,
  /** Markdown (assistant) or plain text (user). */
  content: z.string(),
  createdAt: z.string().nullish(),
  reasoning: z.string().nullish(),
  references: z.array(referenceSchema).nullish(),
  responseTime: z.number().nullish(),
  feedback: messageFeedbackSchema.nullish(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** GET v2/api/conversations/:id?page&size — newest first. */
export const messageHistoryResponseSchema = paginatedSchema(chatMessageSchema);
