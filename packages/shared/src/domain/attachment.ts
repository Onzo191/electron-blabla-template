import { z } from "zod";
import { dataEnvelopeSchema, paginatedSchema } from "../api/envelope";

export const attachmentStatusSchema = z.enum([
  "processing",
  "success",
  "failed",
]);

export type AttachmentStatus = z.infer<typeof attachmentStatusSchema>;

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().optional(),
  status: attachmentStatusSchema,
});

export type Attachment = z.infer<typeof attachmentSchema>;

/** POST v2/api/conversations/:id/attachments/upload */
export const attachmentUploadResponseSchema =
  dataEnvelopeSchema(attachmentSchema);

/** GET v2/api/conversations/:id/attachments */
export const attachmentListResponseSchema = paginatedSchema(attachmentSchema);
