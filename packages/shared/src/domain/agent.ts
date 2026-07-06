import { z } from "zod";
import { dataEnvelopeSchema, paginatedSchema } from "../api/envelope";

export const greetingTranslationSchema = z.object({
  language: z.string(),
  /** Backend-authored HTML fragment (e.g. `<p>Hello!</p>`); render via SafeHtml only. */
  content: z.string(),
});

export const greetingMessageSchema = z.looseObject({
  greetingMessageTranslations: z.array(greetingTranslationSchema),
});

export const agentSummarySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullish(),
  description: z.string().nullish(),
});

export type AgentSummary = z.infer<typeof agentSummarySchema>;

export const agentDetailSchema = agentSummarySchema.extend({
  greetingMessages: z.array(greetingMessageSchema).nullish(),
});

export type AgentDetail = z.infer<typeof agentDetailSchema>;

/**
 * Prompt topic field names are not pinned by the spec — keep every candidate
 * optional and let the UI render the first non-empty label.
 */
export const promptTopicSchema = z.looseObject({
  id: z.string().nullish(),
  title: z.string().nullish(),
  name: z.string().nullish(),
  label: z.string().nullish(),
  content: z.string().nullish(),
});

export type PromptTopic = z.infer<typeof promptTopicSchema>;

export const agentBasicInfoSchema = agentDetailSchema.extend({
  promptTopics: z.array(promptTopicSchema).nullish(),
  sourceConfigs: z.array(z.unknown()).nullish(),
  mcpConfigs: z.array(z.unknown()).nullish(),
});

export type AgentBasicInfo = z.infer<typeof agentBasicInfoSchema>;

/** GET v2/api/agent/end-user/default */
export const defaultAgentResponseSchema = dataEnvelopeSchema(
  z.array(agentDetailSchema),
);

/** GET v2/api/agent/end-user?page&size */
export const agentListResponseSchema = paginatedSchema(agentSummarySchema);

/** GET v2/api/agent/:id/basic-info */
export const agentBasicInfoResponseSchema =
  dataEnvelopeSchema(agentBasicInfoSchema);
