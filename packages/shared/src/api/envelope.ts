import { z } from "zod";

/** Common response envelopes for the v2 backend API. */

export const paginationSchema = z.object({
  page: z.number(),
  size: z.number(),
  total: z.number(),
  hasNextPage: z.boolean(),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** `{ data: T }` */
export function dataEnvelopeSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: item });
}

/** `{ data: { items: T[], pagination } }` */
export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.object({
      items: z.array(item),
      pagination: paginationSchema,
    }),
  });
}

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};
