import { z } from "zod";

/**
 * Structured JSON blocks embedded in assistant markdown between
 * `====MARKER==== … ====END_MARKER====` boundary lines. The renderer's
 * segment parser extracts them and maps each to a widget component.
 * Payloads are loose objects: unknown extra fields must never break parsing.
 */

/** Boundary marker name (as it appears in the markdown) → widget type. */
export const WIDGET_MARKERS = {
  MEDIA: "media",
  SUGGESTIONS: "suggestions",
  SUPPORT_CONTACT: "support_contact",
  REFERENCES: "references",
  CLOSING: "closing",
  ATTACHMENTS: "attachments",
  EXPORT_ARTIFACT: "export_artifact",
  EXPORT_FORMAT_PICKER: "export_format_picker",
  ASK_COLLEAGUES_TOOL: "ask_colleagues",
} as const;

export type WidgetMarker = keyof typeof WIDGET_MARKERS;
export type WidgetType = (typeof WIDGET_MARKERS)[WidgetMarker];

export const mediaItemSchema = z.looseObject({
  url: z.string(),
  alt: z.string().nullish(),
  mediaType: z.enum(["image", "video"]).catch("image"),
});
export type MediaItem = z.infer<typeof mediaItemSchema>;

export const mediaPayloadSchema = z.looseObject({
  intro: z.string().nullish(),
  items: z.array(mediaItemSchema).default([]),
});
export type MediaPayload = z.infer<typeof mediaPayloadSchema>;

export const suggestionsPayloadSchema = z.looseObject({
  intro: z.string().nullish(),
  items: z.array(z.string()).default([]),
});
export type SuggestionsPayload = z.infer<typeof suggestionsPayloadSchema>;

export const supportContactSchema = z.looseObject({
  domain: z.string().nullish(),
  name: z.string().nullish(),
  avatar: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
});
export type SupportContact = z.infer<typeof supportContactSchema>;

export const supportContactPayloadSchema = z.looseObject({
  intro: z.string().nullish(),
  items: z.array(supportContactSchema).default([]),
});
export type SupportContactPayload = z.infer<typeof supportContactPayloadSchema>;

export const referenceItemSchema = z.looseObject({
  title: z.string().nullish(),
  url: z.string().nullish(),
});
export type ReferenceItem = z.infer<typeof referenceItemSchema>;

export const referencesPayloadSchema = z.looseObject({
  intro: z.string().nullish(),
  items: z.array(referenceItemSchema).default([]),
});
export type ReferencesPayload = z.infer<typeof referencesPayloadSchema>;

/** `====CLOSING====` bodies may be plain text; the parser normalizes to `{ text }`. */
export const closingPayloadSchema = z.looseObject({
  text: z.string().default(""),
});
export type ClosingPayload = z.infer<typeof closingPayloadSchema>;

export const attachmentItemSchema = z.looseObject({
  name: z.string(),
  size: z.union([z.string(), z.number()]).nullish(),
  url: z.string(),
});
export type AttachmentItem = z.infer<typeof attachmentItemSchema>;

export const attachmentsPayloadSchema = z.looseObject({
  intro: z.string().nullish(),
  items: z.array(attachmentItemSchema).default([]),
});
export type AttachmentsPayload = z.infer<typeof attachmentsPayloadSchema>;

export const exportArtifactPayloadSchema = z.looseObject({
  attachmentId: z.string(),
  fileName: z.string(),
  format: z.string().nullish(),
  sizeBytes: z.number().nullish(),
  viewUrl: z.string().nullish(),
  downloadUrl: z.string().nullish(),
});
export type ExportArtifactPayload = z.infer<typeof exportArtifactPayloadSchema>;

export const exportFormatPickerPayloadSchema = z.looseObject({
  availableFormats: z.array(z.string()).default([]),
});
export type ExportFormatPickerPayload = z.infer<
  typeof exportFormatPickerPayloadSchema
>;

export const colleagueSchema = z.looseObject({
  name: z.string().nullish(),
  title: z.string().nullish(),
  department: z.string().nullish(),
  office: z.string().nullish(),
  phone: z.string().nullish(),
  zalo: z.string().nullish(),
  email: z.string().nullish(),
  lineManager: z.string().nullish(),
  lineManagerTitle: z.string().nullish(),
  avatar: z.string().nullish(),
  username: z.string().nullish(),
  employeeId: z.string().nullish(),
  tenure: z.string().nullish(),
});
export type Colleague = z.infer<typeof colleagueSchema>;

export const askColleaguesPayloadSchema = z.looseObject({
  intro: z.string().nullish(),
  data: colleagueSchema.nullish(),
});
export type AskColleaguesPayload = z.infer<typeof askColleaguesPayloadSchema>;

export const widgetBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("media"), payload: mediaPayloadSchema }),
  z.object({
    type: z.literal("suggestions"),
    payload: suggestionsPayloadSchema,
  }),
  z.object({
    type: z.literal("support_contact"),
    payload: supportContactPayloadSchema,
  }),
  z.object({ type: z.literal("references"), payload: referencesPayloadSchema }),
  z.object({ type: z.literal("closing"), payload: closingPayloadSchema }),
  z.object({
    type: z.literal("attachments"),
    payload: attachmentsPayloadSchema,
  }),
  z.object({
    type: z.literal("export_artifact"),
    payload: exportArtifactPayloadSchema,
  }),
  z.object({
    type: z.literal("export_format_picker"),
    payload: exportFormatPickerPayloadSchema,
  }),
  z.object({
    type: z.literal("ask_colleagues"),
    payload: askColleaguesPayloadSchema,
  }),
]);

export type WidgetBlock = z.infer<typeof widgetBlockSchema>;
