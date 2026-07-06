import { z } from "zod";
import { referenceSchema } from "../domain/message";

/**
 * Events on the POST v2/api/messages/ask SSE stream, normalized to a
 * discriminated union (the raw wire objects share no discriminator field).
 * Unknown lines/events return null — the stream format is forward-compatible.
 */
export type AskSseEvent =
  | { kind: "start" }
  | { kind: "conversation"; id: string; name: string }
  | { kind: "message-meta"; messageId: string; responseTime?: number }
  | { kind: "reasoning"; text: string }
  | { kind: "tool-status"; tool: string; label: string }
  | { kind: "response"; text: string }
  | { kind: "references"; references: z.infer<typeof referenceSchema>[] }
  | { kind: "stream-error"; message: string; statusCode?: number }
  | { kind: "done" };

const conversationEventSchema = z.looseObject({
  type: z.literal("conversation"),
  id: z.string(),
  name: z.string().catch(""),
});

const toolStatusEventSchema = z.looseObject({
  type: z.literal("tool_status"),
  tool: z.string().catch(""),
  label: z.string().catch(""),
});

const messageMetaEventSchema = z.looseObject({
  messageId: z.string(),
  responseTime: z.number().optional(),
});

const reasoningEventSchema = z.looseObject({ reasoning: z.string() });

const responseEventSchema = z.looseObject({ response: z.string() });

const referencesEventSchema = z.looseObject({
  references: z.array(referenceSchema),
});

const errorEventSchema = z.looseObject({
  error: z.string(),
  statusCode: z.number().optional(),
});

function normalizeAskEvent(json: unknown): AskSseEvent | null {
  const conversation = conversationEventSchema.safeParse(json);
  if (conversation.success) {
    return {
      kind: "conversation",
      id: conversation.data.id,
      name: conversation.data.name,
    };
  }

  const toolStatus = toolStatusEventSchema.safeParse(json);
  if (toolStatus.success) {
    return {
      kind: "tool-status",
      tool: toolStatus.data.tool,
      label: toolStatus.data.label,
    };
  }

  const response = responseEventSchema.safeParse(json);
  if (response.success) {
    return { kind: "response", text: response.data.response };
  }

  const reasoning = reasoningEventSchema.safeParse(json);
  if (reasoning.success) {
    return { kind: "reasoning", text: reasoning.data.reasoning };
  }

  const references = referencesEventSchema.safeParse(json);
  if (references.success) {
    return { kind: "references", references: references.data.references };
  }

  const meta = messageMetaEventSchema.safeParse(json);
  if (meta.success) {
    return {
      kind: "message-meta",
      messageId: meta.data.messageId,
      responseTime: meta.data.responseTime,
    };
  }

  const error = errorEventSchema.safeParse(json);
  if (error.success) {
    return {
      kind: "stream-error",
      message: error.data.error,
      statusCode: error.data.statusCode,
    };
  }

  return null;
}

/**
 * Parses one raw SSE line ("data: <payload>"). Returns null for blank,
 * non-data, malformed, or unrecognized lines.
 */
export function parseAskSseLine(line: string): AskSseEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;

  const payload = trimmed.slice("data:".length).trim();
  if (payload === "") return null;
  if (payload === "[START]") return { kind: "start" };
  if (payload === "[DONE]") return { kind: "done" };

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return null;
  }
  return normalizeAskEvent(json);
}
