// Barrel for shared types, Zod schemas, and pure utilities.

export {
  type Conversation,
  conversationSchema,
  conversationsResponseSchema,
} from "./domain/conversation";
export {
  compareVersions,
  isVersionBelow,
  type UpdatePolicy,
  type UpdateState,
  type UpdateStatus,
  updatePolicySchema,
  updateStateSchema,
  updateStatusSchema,
} from "./domain/update";
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
