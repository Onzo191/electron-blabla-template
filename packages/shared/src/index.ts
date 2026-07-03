// Barrel for shared types, Zod schemas, and pure utilities.

export {
  type AppError,
  appErrorSchema,
  CodedError,
  type IpcResult,
  ipcErr,
  ipcOk,
  toAppError,
} from "./errors";
export {
  type IpcChannel,
  type IpcContract,
  type IpcInvoker,
  type IpcRequest,
  type IpcResponse,
  ipcContract,
} from "./ipc-contract";
