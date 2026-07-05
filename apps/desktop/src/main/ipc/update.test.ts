import type { IpcResult, UpdateStatus } from "@myvng/shared";
import { describe, expect, it, vi } from "vitest";
import type { UpdaterService } from "../services/updater";
import { registerUpdateHandlers } from "./update";

type WrappedHandler = (
  event: unknown,
  raw: unknown,
) => Promise<IpcResult<unknown>>;

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, WrappedHandler>(),
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: WrappedHandler) => {
      handlers.set(channel, handler);
    }),
  },
}));

const baseStatus: UpdateStatus = {
  state: "idle",
  currentVersion: "1.0.0",
  latestVersion: null,
  releaseNotesUrl: null,
  downloadProgress: null,
  isForced: false,
  errorMessage: null,
};

function createFakeService(
  overrides?: Partial<UpdaterService>,
): UpdaterService {
  return {
    getStatus: vi.fn(() => baseStatus),
    checkForUpdates: vi.fn(async () => baseStatus),
    downloadUpdate: vi.fn(async () => baseStatus),
    quitAndInstall: vi.fn(),
    ...overrides,
  };
}

describe("update handlers", () => {
  it("returns the current status for app:getUpdateStatus", async () => {
    handlers.clear();
    const service = createFakeService();
    registerUpdateHandlers(service);

    const result = await handlers.get("app:getUpdateStatus")?.(null, undefined);

    expect(result).toEqual({ ok: true, data: baseStatus });
  });

  it("triggers a check for app:checkForUpdates", async () => {
    handlers.clear();
    const service = createFakeService();
    registerUpdateHandlers(service);

    await handlers.get("app:checkForUpdates")?.(null, undefined);

    expect(service.checkForUpdates).toHaveBeenCalledOnce();
  });

  it("triggers a download for app:downloadUpdate", async () => {
    handlers.clear();
    const service = createFakeService();
    registerUpdateHandlers(service);

    await handlers.get("app:downloadUpdate")?.(null, undefined);

    expect(service.downloadUpdate).toHaveBeenCalledOnce();
  });

  it("quits and installs for app:quitAndInstall", async () => {
    handlers.clear();
    const service = createFakeService();
    registerUpdateHandlers(service);

    const result = await handlers.get("app:quitAndInstall")?.(null, undefined);

    expect(service.quitAndInstall).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, data: { started: true } });
  });
});
