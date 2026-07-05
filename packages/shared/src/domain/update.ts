import { z } from "zod";

export const updateStateSchema = z.enum([
  "idle",
  "checking",
  "available",
  "not-available",
  "downloading",
  "downloaded",
  "error",
]);
export type UpdateState = z.infer<typeof updateStateSchema>;

/**
 * Snapshot of the direct-channel updater. Store builds (process.mas /
 * process.windowsStore) never produce this — those update via their store.
 */
export const updateStatusSchema = z.object({
  state: updateStateSchema,
  currentVersion: z.string(),
  latestVersion: z.string().nullable(),
  releaseNotesUrl: z.string().nullable(),
  downloadProgress: z.number().min(0).max(100).nullable(),
  isForced: z.boolean(),
  errorMessage: z.string().nullable(),
});
export type UpdateStatus = z.infer<typeof updateStatusSchema>;

/** update-policy.json, fetched from the same host as the update feed. */
export const updatePolicySchema = z.object({
  latestVersion: z.string(),
  minSupportedVersion: z.string(),
  forceUpdate: z.boolean(),
  releaseNotesUrl: z.string().nullable(),
});
export type UpdatePolicy = z.infer<typeof updatePolicySchema>;

/**
 * Compares two plain "x.y.z" release versions (no ranges/prerelease tags —
 * that's all electron-builder ever produces for app.getVersion()).
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) return numA < numB ? -1 : 1;
  }
  return 0;
}

export function isVersionBelow(current: string, minSupported: string): boolean {
  return compareVersions(current, minSupported) < 0;
}
