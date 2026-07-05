import {
  isVersionBelow,
  type UpdatePolicy,
  type UpdateState,
  type UpdateStatus,
  updatePolicySchema,
} from "@myvng/shared";
import { app } from "electron";
import { autoUpdater } from "electron-updater";
import { logger } from "./logger";

const FALLBACK_POLICY_URL =
  "https://updates.internal.vng.com.vn/agent-desktop/latest/update-policy.json";

/** How often the main process re-checks for updates while the app stays open. */
export const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

/**
 * UPDATE_POLICY_URL is overridable so this can point at the agentic
 * backend's own release endpoint instead of a static file host — see
 * docs/release-cicd.md Section 5.2 (the real host isn't decided yet, so
 * this can't be pinned to a fixed allowlist). Still refuse anything that
 * isn't a well-formed https URL: this value only ever comes from trusted
 * build/launch configuration, never from user or network input, but a
 * malformed or non-https override (plaintext http, file:, etc.) would
 * either downgrade the request to a spoofable channel or read local
 * state instead of fetching a policy — reject it and fall back rather
 * than silently doing something unintended.
 */
export function resolvePolicyUrl(): string {
  const override = process.env.UPDATE_POLICY_URL;
  if (!override) return FALLBACK_POLICY_URL;
  try {
    const parsed = new URL(override);
    if (parsed.protocol !== "https:") {
      logger.warn(`Ignoring UPDATE_POLICY_URL (must be https): ${override}`);
      return FALLBACK_POLICY_URL;
    }
    return parsed.toString();
  } catch {
    logger.warn(`Ignoring malformed UPDATE_POLICY_URL: ${override}`);
    return FALLBACK_POLICY_URL;
  }
}

const DEFAULT_POLICY_URL = resolvePolicyUrl();

export interface UpdaterService {
  getStatus(): UpdateStatus;
  checkForUpdates(): Promise<UpdateStatus>;
  downloadUpdate(): Promise<UpdateStatus>;
  quitAndInstall(): void;
}

/**
 * True for Mac App Store / Microsoft Store builds. Electron sets these
 * flags automatically at runtime; store builds must never initialize
 * electron-updater — the store owns updates for them (see
 * docs/release-cicd.md).
 */
export function isStoreBuild(): boolean {
  return process.mas === true || process.windowsStore === true;
}

export function createUpdaterService(opts?: {
  policyUrl?: string;
}): UpdaterService {
  const policyUrl = opts?.policyUrl ?? DEFAULT_POLICY_URL;

  let state: UpdateState = "idle";
  let latestVersion: string | null = null;
  let releaseNotesUrl: string | null = null;
  let downloadProgress: number | null = null;
  let errorMessage: string | null = null;
  let policy: UpdatePolicy | null = null;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on("checking-for-update", () => {
    state = "checking";
    errorMessage = null;
  });
  autoUpdater.on("update-available", (info) => {
    state = "available";
    latestVersion = info.version;
    releaseNotesUrl =
      typeof info.releaseNotes === "string" ? info.releaseNotes : null;
  });
  autoUpdater.on("update-not-available", () => {
    state = "not-available";
  });
  autoUpdater.on("download-progress", (progress) => {
    state = "downloading";
    downloadProgress = progress.percent;
  });
  autoUpdater.on("update-downloaded", () => {
    state = "downloaded";
    downloadProgress = 100;
  });
  autoUpdater.on("error", (err) => {
    state = "error";
    errorMessage = err.message;
    logger.error(`auto-updater error: ${err.message}`);
  });

  async function refreshPolicy(): Promise<void> {
    try {
      const res = await fetch(policyUrl);
      if (!res.ok) return;
      policy = updatePolicySchema.parse(await res.json());
    } catch (e) {
      logger.warn(`could not fetch update policy: ${String(e)}`);
    }
  }

  function snapshot(): UpdateStatus {
    const currentVersion = app.getVersion();
    const isForced =
      policy != null &&
      (policy.forceUpdate ||
        isVersionBelow(currentVersion, policy.minSupportedVersion));
    return {
      state,
      currentVersion,
      latestVersion,
      releaseNotesUrl,
      downloadProgress,
      isForced,
      errorMessage,
    };
  }

  return {
    getStatus: snapshot,
    async checkForUpdates() {
      await refreshPolicy();
      await autoUpdater.checkForUpdates();
      return snapshot();
    },
    async downloadUpdate() {
      await autoUpdater.downloadUpdate();
      return snapshot();
    },
    quitAndInstall() {
      autoUpdater.quitAndInstall();
    },
  };
}

/**
 * Runs an immediate check plus a recurring poll so a soft or forced update
 * surfaces without the user having to trigger one — nothing else in the
 * app calls checkForUpdates(), so without this the update UI never appears.
 * Returns a disposer to stop the poll (call on app quit).
 */
export function startUpdateChecks(service: UpdaterService): () => void {
  const runCheck = (): void => {
    service.checkForUpdates().catch((e: unknown) => {
      logger.error(`scheduled update check failed: ${String(e)}`);
    });
  };

  runCheck();
  const timer = setInterval(runCheck, UPDATE_CHECK_INTERVAL_MS);

  return () => clearInterval(timer);
}
