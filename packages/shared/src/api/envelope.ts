import { z } from "zod";

/** Common response envelopes for the v2 backend API. */

export const paginationSchema = z
  .object({
    page: z.number().optional(),
    size: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    total: z.number(),
    hasNextPage: z.boolean(),
  })
  .transform((data) => {
    const limit = data.limit ?? data.size ?? 20;
    const offset = data.offset ?? 0;
    const page = data.page ?? Math.floor(offset / limit) + 1;
    const size = data.size ?? limit;
    return {
      page,
      size,
      total: data.total,
      hasNextPage: data.hasNextPage,
    };
  });

export type Pagination = z.infer<typeof paginationSchema>;

/** `{ data: T }` */
export function dataEnvelopeSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: item });
}

export function paginatedSchema<T extends z.ZodType>(
  item: T,
): z.ZodType<
  {
    data: {
      items: z.infer<T>[];
      pagination: Pagination;
    };
  },
  unknown
> {
  const schema = z.object({
    data: z.object({
      items: z.array(item),
      pagination: paginationSchema,
    }),
  });
  return schema as unknown as z.ZodType<
    {
      data: {
        items: z.infer<T>[];
        pagination: Pagination;
      };
    },
    unknown
  >;
}

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};
