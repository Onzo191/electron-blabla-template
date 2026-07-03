import { toAppError } from "@myvng/shared";
import type { z } from "zod";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiError";
    this.code = code;
  }
}

export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) {
      throw new Error(`${path} responded with ${response.status}`);
    }
    const json: unknown = await response.json();
    return schema.parse(json);
  } catch (error) {
    const appError = toAppError(error);
    throw new ApiError(appError.message, appError.code, { cause: error });
  }
}
