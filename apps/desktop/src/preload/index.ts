import { electronAPI } from "@electron-toolkit/preload";
import { type IpcInvoker, ipcContract, ipcErr } from "@myvng/shared";
import { contextBridge, ipcRenderer } from "electron";

// The single typed surface the renderer gets. Every call goes through the
// contract; the runtime guard covers callers that bypass TypeScript.
const invoke: IpcInvoker = (channel, request) => {
  if (!(channel in ipcContract)) {
    return Promise.resolve(
      ipcErr({
        code: "UNKNOWN_CHANNEL",
        message: `Unknown IPC channel: ${String(channel)}`,
      }),
    );
  }
  return ipcRenderer.invoke(channel, request);
};

const api = { invoke };

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
