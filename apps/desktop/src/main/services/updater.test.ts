import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../tests/msw/server";
import type { UpdaterService } from "./updater";
import {
  createUpdaterService,
  resolvePolicyUrl,
  startUpdateChecks,
  UPDATE_CHECK_INTERVAL_MS,
} from "./updater";

const { listeners, autoUpdaterMock } = vi.hoisted(() => {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  return {
    listeners,
    autoUpdaterMock: {
      autoDownload: true,
      autoInstallOnAppQuit: false,
      allowDowngrade: true,
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners.set(event, cb);
      }),
      checkForUpdates: vi.fn(async () => {
        listeners.get("checking-for-update")?.();
        listeners.get("update-available")?.({
          version: "2.0.0",
          releaseNotes: null,
        });
      }),
      downloadUpdate: vi.fn(async () => {
        listeners.get("update-downloaded")?.();
      }),
      quitAndInstall: vi.fn(),
    },
  };
});

vi.mock("electron-updater", () => ({ autoUpdater: autoUpdaterMock }));
vi.mock("electron", () => ({ app: { getVersion: vi.fn(() => "1.0.0") } }));

const POLICY_URL = "https://updates.test/agent-desktop/update-policy.json";

describe("updater service", () => {
  beforeEach(() => {
    listeners.clear();
    autoUpdaterMock.checkForUpdates.mockClear();
    autoUpdaterMock.downloadUpdate.mockClear();
    autoUpdaterMock.quitAndInstall.mockClear();
  });

  it("configures autoUpdater for manual, no-downgrade updates", () => {
    createUpdaterService({ policyUrl: POLICY_URL });

    expect(autoUpdaterMock.autoDownload).toBe(false);
    expect(autoUpdaterMock.autoInstallOnAppQuit).toBe(true);
    expect(autoUpdaterMock.allowDowngrade).toBe(false);
  });

  it("reports an available update after checking", async () => {
    server.use(
      http.get(POLICY_URL, () =>
        HttpResponse.json({
          latestVersion: "2.0.0",
          minSupportedVersion: "1.0.0",
          forceUpdate: false,
          releaseNotesUrl: null,
        }),
      ),
    );
    const service = createUpdaterService({ policyUrl: POLICY_URL });

    const status = await service.checkForUpdates();

    expect(status.state).toBe("available");
    expect(status.latestVersion).toBe("2.0.0");
    expect(status.isForced).toBe(false);
  });

  it("forces the update when the current version is below the policy minimum", async () => {
    server.use(
      http.get(POLICY_URL, () =>
        HttpResponse.json({
          latestVersion: "2.0.0",
          minSupportedVersion: "1.5.0",
          forceUpdate: false,
          releaseNotesUrl: null,
        }),
      ),
    );
    const service = createUpdaterService({ policyUrl: POLICY_URL });

    const status = await service.checkForUpdates();

    expect(status.isForced).toBe(true);
  });

  it("forces the update when the policy sets the kill-switch", async () => {
    server.use(
      http.get(POLICY_URL, () =>
        HttpResponse.json({
          latestVersion: "1.0.0",
          minSupportedVersion: "1.0.0",
          forceUpdate: true,
          releaseNotesUrl: null,
        }),
      ),
    );
    const service = createUpdaterService({ policyUrl: POLICY_URL });

    const status = await service.checkForUpdates();

    expect(status.isForced).toBe(true);
  });

  it("does not force an update when the policy fetch fails", async () => {
    server.use(http.get(POLICY_URL, () => HttpResponse.error()));
    const service = createUpdaterService({ policyUrl: POLICY_URL });

    const status = await service.checkForUpdates();

    expect(status.isForced).toBe(false);
  });

  it("reports the downloaded state once downloadUpdate resolves", async () => {
    server.use(http.get(POLICY_URL, () => HttpResponse.error()));
    const service = createUpdaterService({ policyUrl: POLICY_URL });

    const status = await service.downloadUpdate();

    expect(status.state).toBe("downloaded");
    expect(status.downloadProgress).toBe(100);
  });

  it("delegates quitAndInstall to autoUpdater", () => {
    const service = createUpdaterService({ policyUrl: POLICY_URL });

    service.quitAndInstall();

    expect(autoUpdaterMock.quitAndInstall).toHaveBeenCalledOnce();
  });
});

describe("startUpdateChecks", () => {
  function fakeService(
    checkForUpdates: UpdaterService["checkForUpdates"],
  ): UpdaterService {
    return {
      getStatus: vi.fn(),
      checkForUpdates,
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks immediately and then again on the poll interval", async () => {
    const checkForUpdates = vi.fn().mockResolvedValue({});
    const stop = startUpdateChecks(fakeService(checkForUpdates));

    expect(checkForUpdates).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
    expect(checkForUpdates).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
    expect(checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it("logs and keeps polling when a scheduled check rejects", async () => {
    const checkForUpdates = vi.fn().mockRejectedValue(new Error("offline"));
    startUpdateChecks(fakeService(checkForUpdates));

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);

    expect(checkForUpdates).toHaveBeenCalledTimes(2);
  });
});

const FALLBACK_POLICY_URL =
  "https://updates.internal.vng.com.vn/agent-desktop/latest/update-policy.json";

describe("resolvePolicyUrl", () => {
  afterEach(() => {
    delete process.env.UPDATE_POLICY_URL;
  });

  it("falls back to the default host when unset", () => {
    delete process.env.UPDATE_POLICY_URL;

    expect(resolvePolicyUrl()).toBe(FALLBACK_POLICY_URL);
  });

  it("accepts a well-formed https override", () => {
    process.env.UPDATE_POLICY_URL = "https://backend.internal/desktop/policy";

    expect(resolvePolicyUrl()).toBe("https://backend.internal/desktop/policy");
  });

  it("falls back when the override is not https", () => {
    process.env.UPDATE_POLICY_URL =
      "http://updates.internal.vng.com.vn/policy.json";

    expect(resolvePolicyUrl()).toBe(FALLBACK_POLICY_URL);
  });

  it("falls back when the override uses a non-network scheme", () => {
    process.env.UPDATE_POLICY_URL = "file:///etc/passwd";

    expect(resolvePolicyUrl()).toBe(FALLBACK_POLICY_URL);
  });

  it("falls back when the override is not a valid URL", () => {
    process.env.UPDATE_POLICY_URL = "not-a-url";

    expect(resolvePolicyUrl()).toBe(FALLBACK_POLICY_URL);
  });
});
