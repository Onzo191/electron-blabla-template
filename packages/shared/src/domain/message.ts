import { z } from "zod";
import { type Pagination, paginatedSchema } from "../api/envelope";

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
export const chatMessageSchema: z.ZodType<
  {
    id: string;
    role: MessageRole;
    content: string;
    createdAt?: string | null;
    reasoning?: string | null;
    references?: Reference[] | null;
    responseTime?: number | null;
    feedback?: MessageFeedback | null;
  },
  unknown
> = z
  .looseObject({
    id: z.string(),
    sender: z.string().optional(),
    role: messageRoleSchema.optional(),
    message: z.string().optional(),
    content: z.string().optional(),
    createdAt: z.string().nullish(),
    reasoning: z.string().nullish(),
    references: z.array(referenceSchema).nullish(),
    responseTime: z.number().nullish(),
    feedback: z
      .union([
        messageFeedbackSchema,
        z.looseObject({
          rating: messageFeedbackSchema,
        }),
      ])
      .nullish(),
  })
  .transform((data) => {
    let role: MessageRole = "user";
    if (data.role) {
      role = data.role;
    } else if (data.sender) {
      role = data.sender === "assistant" ? "assistant" : "user";
    }

    const content = data.content ?? data.message ?? "";

    let feedback: MessageFeedback | null = null;
    if (data.feedback) {
      if (typeof data.feedback === "string") {
        feedback = data.feedback;
      } else if (data.feedback.rating) {
        feedback = data.feedback.rating;
      }
    }

    return {
      id: data.id,
      role,
      content,
      createdAt: data.createdAt,
      reasoning: data.reasoning,
      references: data.references,
      responseTime: data.responseTime,
      feedback,
    };
  });

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const messageHistoryResponseSchema: z.ZodType<
  {
    data: {
      items: ChatMessage[];
      pagination: Pagination;
    };
  },
  unknown
> = paginatedSchema(chatMessageSchema);
