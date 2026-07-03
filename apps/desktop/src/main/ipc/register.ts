import {
  type IpcChannel,
  type IpcRequest,
  type IpcResponse,
  type IpcResult,
  ipcContract,
  ipcErr,
  ipcOk,
  toAppError,
} from "@myvng/shared";
import { ipcMain } from "electron";

/**
 * Register a handler for a contract channel. The request is validated
 * before the handler runs and the response is validated before it is
 * returned; any failure becomes an { ok: false, error } envelope so raw
 * errors never cross the IPC boundary.
 */
export function registerHandler<C extends IpcChannel>(
  channel: C,
  handler: (req: IpcRequest<C>) => Promise<IpcResponse<C>> | IpcResponse<C>,
): void {
  ipcMain.handle(
    channel,
    async (_event, raw): Promise<IpcResult<IpcResponse<C>>> => {
      try {
        const req = ipcContract[channel].request.parse(raw) as IpcRequest<C>;
        const res = ipcContract[channel].response.parse(
          await handler(req),
        ) as IpcResponse<C>;
        return ipcOk(res);
      } catch (e) {
        return ipcErr(toAppError(e));
      }
    },
  );
}
