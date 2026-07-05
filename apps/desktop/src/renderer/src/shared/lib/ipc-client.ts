import type { IpcChannel, IpcRequest, IpcResponse } from "@myvng/shared";

export class IpcInvokeError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "IpcInvokeError";
    this.code = code;
  }
}

/** Invokes a contract channel and unwraps the envelope, throwing on failure. */
export async function invokeOrThrow<C extends IpcChannel>(
  channel: C,
  request: IpcRequest<C>,
): Promise<IpcResponse<C>> {
  const result = await window.api.invoke(channel, request);
  if (result.ok) return result.data;
  throw new IpcInvokeError(result.error.message, result.error.code);
}
