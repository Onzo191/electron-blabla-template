import type { ElectronAPI } from "@electron-toolkit/preload";
import type { IpcInvoker } from "@myvng/shared";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      invoke: IpcInvoker;
    };
  }
}
