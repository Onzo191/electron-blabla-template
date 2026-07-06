# Release Runbook

Operational companion to [`docs/release-cicd.md`](./release-cicd.md) (which
covers the *why* of the architecture). This doc covers the *what to set up*
and *who does what*: environments to provision, the store submission
process, how update automation works today, and the decision on where the
version-policy service should live.

---

## 1. Two independent "version" mechanisms — read this first

Everything below hinges on one distinction that's easy to conflate:

| Mechanism | Drives | Who/what serves it | Automation today |
| --- | --- | --- | --- |
| **A. `electron-updater` feed** (`latest.yml` / `latest-mac.yml` + the installer files) | The *optional* "Update available" banner, the actual download, and the download URL itself | A plain HTTPS static file host (object storage bucket). `electron-builder` generates these files as a side effect of `electron-builder --publish`; **no custom backend code is involved at all**. | Will be **fully automatic** once the release job exists — CI uploads new files on every tag, `electron-updater` picks them up on its own. |
| **B. Our own version-policy check** (`minSupportedVersion` / `forceUpdate`) | The **forced**, non-dismissable update dialog | A plain `fetch()` in [`apps/desktop/src/main/services/updater.ts`](../apps/desktop/src/main/services/updater.ts) against `UPDATE_POLICY_URL` | Partially manual by design (see §7) — this is the one piece that needs a service-location decision (§6). |

So "viết 1 service cho download và get version" is really two unrelated
questions:

- **Download + "is there a newer build" detection**: not a service — just an
  object storage bucket, already fully specified in
  [release-cicd.md §5.1](./release-cicd.md#5-update-feed-hosting-direct-channel-only).
  Nothing new to build.
- **Forced-update policy**: the one open decision — see §6.

**Implementation note (read before wiring anything up):** the
`updatePolicySchema` shape (`packages/shared/src/domain/update.ts`) has
`latestVersion` and `releaseNotesUrl` fields, but
`apps/desktop/src/main/services/updater.ts` currently only reads
`minSupportedVersion` and `forceUpdate` from the fetched policy — the
banner's version number and release notes always come from
`electron-updater`'s own `update-available` event, never from the policy
response. Don't build automation to keep `policy.latestVersion` in sync
with reality; nothing consumes it yet. If you want the forced dialog to
show real release notes, that's a small follow-up change to
`updater.ts`'s `snapshot()`, not a CI/infra task.

---

## 2. Environments & accounts to provision

| # | What | Why | Blocks | Status |
| --- | --- | --- | --- | --- |
| 1 | GitLab **Docker runner** | `check` stage (typecheck/lint/test) | Nothing — the shared runner already works | ✅ done |
| 2 | GitLab **macOS runner**, tag `macos` | `build:mac` (smoke) + `release:mac-direct` + `release:mac-mas` | Needs real Apple hardware — rent from MacStadium / AWS EC2 Mac / Orka (see [release-cicd.md §4.1.1](./release-cicd.md#411-these-should-be-cloud-runners-not-anyones-laptop)) | ❌ not provisioned |
| 3 | GitLab **Windows runner**, tag `windows` | `build:win` (smoke) + `release:win-direct` + `release:win-store` | Any Windows Server VM on the team's existing cloud + GitLab Runner service installed | ❌ not provisioned |
| 4 | **Apple Developer Program** org account | Developer ID cert (direct channel) + Distribution cert (MAS) | Both mac release jobs | ❌ needs decision on who owns/pays |
| 5 | **App Store Connect** access under that org account | MAS submission (`fastlane deliver` or manual) | `release:mac-mas` (human step) | ❌ blocked on #4 |
| 6 | **Windows code-signing vendor** account — SSL.com eSigner or DigiCert KeyLocker | Signs the `.exe`/NSIS installer; **not** Azure Trusted Signing (VNG doesn't qualify — see [release-cicd.md §3](./release-cicd.md#3-code-signing--notarization)) | `release:win-direct` | ❌ needs vendor pick |
| 7 | **Microsoft Partner Center** developer account | Reserve app identity, Store submission | `release:win-store` | ❌ not provisioned |
| 8 | **Object storage bucket** for `updates.internal.vng.com.vn` (MinIO on existing infra, or a cloud bucket) | Hosts binaries + `latest.yml`/`latest-mac.yml` — mechanism A above | `release:publish-update-feed` | ❌ not provisioned |
| 9 | **Version-policy endpoint** — decision in §6 | Mechanism B above | `update-policy` job, and the forced-update UI having anything real to check against | ❌ open decision |
| 10 | GitLab **protected + masked CI/CD variables** and **Secure Files** for every secret in the table above | Keeps certs/tokens out of the repo and job logs | All `release:*` jobs | Set up per-secret once each is provisioned |

Nothing in rows 4–9 blocks **testing the app-side update logic itself** —
that's exactly what the local smoke-test recipe in §4 covers, with zero
accounts or certs.

---

## 3. Store submission process

Both store jobs in `.gitlab-ci.yml` (`release:mac-mas`, `release:win-store`)
are `when: manual` **on top of** the tag-gate — CI's job stops at "produce a
signed, submission-ready artifact"; a human always does the actual
submission. This is not a limitation to work around: both stores require
metadata/screenshots/compliance answers that live in their respective
consoles, not in a build artifact.

### Mac App Store

1. Push tag `vX.Y.Z` → pipeline reaches `release` stage → manually trigger
   `release:mac-mas` in GitLab's UI.
2. Job runs `electron-builder --mac mas --config electron-builder.mas.yml`
   with the Apple Distribution cert + provisioning profile (Secure Files),
   producing a `.pkg`.
3. A human uploads it via `fastlane deliver` (recommended — scriptable,
   re-runnable) or `xcrun altool`/Transporter, then fills in
   release notes / screenshots / compliance in App Store Connect if this is
   a listing change (routine version bumps usually don't need this).
4. Submit for review in App Store Connect. Apple review = hours to days.
   No mechanism on our side to know when it clears — check App Store
   Connect or its webhook/notification settings.
5. Once approved, Apple's own updater rolls it out — **our forced-update
   policy does not apply to MAS builds** (`isStoreBuild()` skips the
   updater entirely). If a MAS release needs to be forced, the only lever
   is Apple's "phased release" / expedited review request — there is no
   client-side kill switch for store builds today (see §7's open item on
   this).

### Microsoft Store

1. Same tag → manual-trigger `release:win-store`.
2. Job runs `electron-builder --win appx --config electron-builder.appx.yml`
   using the identity reserved in Partner Center, producing an `.appx`/`.msix`.
3. A human uploads via Partner Center's submission UI or the Microsoft
   Store Submission API, fills in listing changes if any.
4. Store certification = hours to days, same caveat as Apple: no
   programmatic "is it live yet" signal wired into this pipeline.
5. Same limitation as MAS: no forced-update lever for Store builds.

**Practical implication:** if forced/critical updates matter for your user
base, steer users toward the **direct-download channel** (where the forced
dialog works) for anyone who needs guaranteed fast patching, and treat the
stores as a discoverability/convenience channel. This is exactly the
distinction the channels table in
[release-cicd.md §1](./release-cicd.md#1-distribution-channels) already
draws.

---

## 4. How update automation works today (app side — already implemented)

This part needs **no further infrastructure** — it's shipped and tested
right now:

- On `app.whenReady()`, the main process calls `startUpdateChecks()`
  ([`updater.ts`](../apps/desktop/src/main/services/updater.ts)), which runs
  an immediate check, then re-checks every `UPDATE_CHECK_INTERVAL_MS`
  (4 hours) for as long as the app stays open. No user action, no menu
  item required.
- Each check does two independent things:
  1. `autoUpdater.checkForUpdates()` — asks the feed (mechanism A) "is
     there a newer build than mine?" Drives `state: "available"` /
     `"downloaded"`.
  2. `refreshPolicy()` — asks `UPDATE_POLICY_URL` (mechanism B) "am I below
     the minimum supported version, or is the kill-switch on?" Drives
     `isForced: boolean`.
- The renderer polls `app:getUpdateStatus` every 2s
  ([`useUpdateStatus.ts`](../apps/desktop/src/renderer/src/features/updates/hooks/useUpdateStatus.ts))
  and renders:
  - `isForced === true` → full-screen `ForcedUpdateDialog`, no dismiss, no
    escape — takes priority over everything else.
  - `state: "available"` / `"downloaded"`, not forced → dismissable
    `UpdateBanner`.
  - Store builds (`process.mas` / `process.windowsStore`) → nothing at
    all; `isStoreBuild()` skips registering the updater entirely at
    `ipc/index.ts`.
- Store builds (`process.mas`/`process.windowsStore`) never run any of
  this — verified by `isStoreBuild()` gating `registerUpdateHandlers` in
  [`ipc/index.ts`](../apps/desktop/src/main/ipc/index.ts).

**How to re-verify this yourself** without any store/cert/runner setup —
the exact recipe used to validate the current implementation:

1. Bump `apps/desktop/package.json` version above the "installed" one
   (e.g. `0.1.0`), build with
   `electron-builder --mac --publish always -c.publish.url=http://127.0.0.1:<port>/latest`
   — produces real `latest-mac.yml` + installer, identical to what
   `release:publish-update-feed` would upload.
2. Serve that output directory with `python3 -m http.server <port>`.
3. Revert the version to baseline, build again with the **same**
   `publish.url` — the packaged app's embedded `app-update.yml` now points
   at your local feed.
4. Launch the packaged binary (`<app>.app/Contents/MacOS/<name>` on macOS)
   via Playwright's `_electron.launch({ executablePath })` — this runs the
   real, packaged `electron-updater` flow (`app.isPackaged === true`, no
   dev-mode workarounds needed). Assert `getByRole("alert")` shows the
   banner.
5. For the forced path: stand up a tiny local HTTPS server (self-signed
   cert via `openssl req -x509 ...` is fine) serving a
   `update-policy.json` with `minSupportedVersion` above the installed
   version, launch with
   `env: { UPDATE_POLICY_URL: "https://127.0.0.1:<port>/policy.json", NODE_TLS_REJECT_UNAUTHORIZED: "0" }`,
   assert `getByRole("alertdialog")` shows "Update required" with no
   Dismiss button.

Both scenarios pass today against the current code. This is a manual
recipe, not a checked-in test, because it needs a real packaged build
(minutes, not seconds) — not something to run on every `pnpm check`, but
worth re-running before a release if the updater code changes.

---

## 5. End-to-end pipeline: from `git push --tags` to the user's screen

**Direct channel (fully automatable once infra exists):**

```
git tag v1.4.0 && git push --tags
        │
        ▼
CI: check (lint/typecheck/test)
        │
        ▼
CI: release:mac-direct, release:win-direct   (sign + notarize, tag-gated, runs automatically — no `when: manual`)
        │
        ▼
CI: release:publish-update-feed              (uploads dmg/zip/nsis + latest.yml/latest-mac.yml to the bucket, also automatic)
        │
        ▼
Every running app's next 4-hourly check (or app restart) sees the new
latest.yml → state becomes "available" → user sees the dismissable banner
        │
        ▼
User clicks "Update", or it installs automatically on next quit
(autoInstallOnAppQuit: true)
```

Nothing here requires a human — the tag push itself was already the
deliberate "ship this" action; the jobs will fail fast with a `TODO`
message until the certs/runners/bucket from §2 exist, but nothing is
gated behind a manual click once they do. The version-policy endpoint
from mechanism B is orthogonal to this flow entirely; it's only
consulted to decide `isForced`, not to detect that an update exists.

**Store channel:** identical up through `check` + build, then diverges into
the human-gated submission process in §3 — store review time (hours–days)
is the pipeline's real bottleneck and can't be automated away.

**Forced kill-switch (independent of any build):**

```
Security issue found in an already-shipped version
        │
        ▼
Human: GitLab UI → CI/CD → Pipelines → "Run pipeline" → fill in
MIN_SUPPORTED_VERSION (+ optional FORCE_UPDATE=true)
        │
        ▼
`update-policy` job: one `curl -X POST` to the version-policy endpoint —
no build, no cert, seconds not minutes
        │
        ▼
Every running app's next check (≤4h) sees isForced: true → full-screen
dialog, blocks the app until updated
```

This path deliberately never touches a code-signing cert or a build step —
see [release-cicd.md §6.1](./release-cicd.md#61-flipping-the-flag-without-a-build-the-update-policy-job)
for why that separation matters.

---

## 6. Decision: standalone release service vs. integrate into the existing backend

This decision **only concerns mechanism B** (the version-policy check) —
mechanism A needs no service at all, just the bucket from §2 row 8.

### Recommendation: integrate into the existing agentic backend

Add a small route group (e.g. `/desktop/releases/*`) to the backend you
already run, rather than standing up a new service.

**Why:**

- The backend already has auth, logging, deploy tooling, and an on-call
  path — a new standalone service duplicates all of that for what is,
  today, two fields (`minSupportedVersion`, `forceUpdate`) behind one GET
  and one POST.
- The client code is already decoupled from this decision:
  `UPDATE_POLICY_URL` is just an env var pointing at *some* URL returning
  the `UpdatePolicy` shape
  (`packages/shared/src/domain/update.ts`). Nothing on the desktop side
  needs to change if you outgrow this and extract it into its own service
  later — this is a reversible, low-cost decision, not an architectural
  lock-in.
- A team this size operating a desktop client for an existing backend
  rarely benefits from a second service to keep patched, monitored, and
  on-call for — the marginal complexity isn't paid for by two fields.

**When a standalone service would earn its keep instead:** if this grows
into real release management — staged rollout by cohort, per-platform
release channels, telemetry on which versions are still checking in,
multiple client apps (not just this desktop one) sharing the same release
infra. None of that exists yet; build it when it's needed, not
speculatively.

### Proposed API contract (if integrated into the existing backend)

```
GET /desktop/releases/policy
  → 200 { latestVersion, minSupportedVersion, forceUpdate, releaseNotesUrl }
  Public, unauthenticated, rate-limited (see rationale below), cache
  1-5 min at the edge/CDN if you have one — this is read by every running
  desktop app every 4 hours, so it should be cheap and never depend on
  session/auth state.

POST /desktop/releases/policy
  → sets minSupportedVersion / forceUpdate
  Auth: bearer token (`RELEASE_API_TOKEN`, same as today's
  `RELEASE_POLICY_API_URL` in .gitlab-ci.yml) — CI-only, never a user
  token. Called by the manual `update-policy` job (§5's kill-switch path).
```

**Why the GET must be unauthenticated:** the forced-update dialog exists
specifically to catch users whose install can no longer talk to the
backend correctly (breaking API change, revoked/incompatible client). If
checking for a forced update itself required a valid session, a user stuck
on a broken version could get stuck in a loop where the thing that's
supposed to unblock them depends on the thing that's already broken. This
mirrors the reasoning already in
[release-cicd.md §6](./release-cicd.md#6-forced-vs-optional-update-ux)
("the alternative is an app that can't talk to the backend at all").

### Migration note

Whoever owns this backend route only needs to honor the `UpdatePolicy`
Zod schema — no IPC or renderer change is required on the desktop side
either way. This is the same conclusion
[release-cicd.md §5.2](./release-cicd.md#52-the-version-policy-check-our-own-forced-update-logic)
already reached; this runbook just turns it into a decision.

---

## 7. What should be automatic vs. gated — and why

| Task | Automation level | Why |
| --- | --- | --- |
| `check` (lint/typecheck/test) | **Fully automatic**, every push/MR | No blast radius — pure feedback |
| `build:mac` / `build:win` smoke packaging | **Fully automatic**, every push/MR | Unsigned, never distributed, just proves packaging still works |
| Sign + notarize + package (`release:*-direct`) | **Automatic on tag push** — no `when: manual` in `.gitlab-ci.yml` | A tag is already a deliberate human decision ("this commit is a release"); gating twice adds friction without adding safety |
| Upload binaries + `latest.yml` (`release:publish-update-feed`) | **Automatic**, chained right after signing succeeds | This only makes an *optional* update visible — reversible, low blast radius, exactly mechanism A |
| Store submission (`release:mac-mas`, `release:win-store`) | **Stays manual** | Apple/Microsoft require a human in their console regardless; automating the build doesn't remove that step |
| `minSupportedVersion` / `forceUpdate` (the kill-switch) | **Stays manual**, human-triggered pipeline | This can lock every user out of the app until they update — the one place in this whole system where "ưu tiên tự động" should lose to "a human meant to do this right now". A bad automatic trigger here is an outage you caused yourself. |

The general principle: automate anything whose failure mode is "a user
doesn't see an update prompt yet" (low cost, self-heals on the next
4-hourly check); keep a human in the loop for anything whose failure mode
is "every user's app is blocked right now."

---

## 8. Rollback

- Installers are immutable per version — there's no "un-ship" for a binary
  already downloaded by a user.
- "Rollback" for the direct channel = re-point `latest.yml` at the
  previous version's files. Since `allowDowngrade: false` client-side, a
  user who already updated won't be silently downgraded — this is a
  forward-only emergency action for users who haven't updated yet, not a
  way to undo an update in place.
- If the bad release is already forced (`forceUpdate: true`), immediately
  re-run `update-policy` with `FORCE_UPDATE=false` (and/or bump
  `minSupportedVersion` back down) — this takes effect on every running
  app's next check, no rebuild needed.
- Store channel: there is no rollback lever at all once Apple/Microsoft
  approve a release — this is a hard constraint of using stores, not
  something this pipeline can work around. Factor that into how much
  testing happens before a store submission specifically.

---

## 9. Pre-go-live checklist

The direct-channel jobs (`release:mac-direct`, `release:win-direct`,
`release:publish-update-feed`) already run automatically on every version
tag — no `when: manual` to flip. That means the very next tag pushed after
provisioning starts a real release, so confirm all of this **before**
pushing that tag, not after:

- [ ] Runner registered with the matching `tags:` and can reach the GitLab
      instance (§2 rows 1–3)
- [ ] All Secure Files / protected variables for that job exist and are
      scoped to protected branches/tags only (§2 row 10)
- [ ] The bucket at `updates.internal.vng.com.vn` exists and
      `electron-builder.yml`'s `publish.url` points at it, not the
      placeholder (§2 row 8)
- [ ] Decision from §6 made and `UPDATE_POLICY_URL` (or its production
      default in `updater.ts`) points at the real endpoint, not the
      current `FALLBACK_POLICY_URL` placeholder
- [ ] Ran the local smoke-test recipe in §4 against a build produced the
      same way CI will produce it (same `electron-builder` invocation,
      unsigned is fine for this check)
- [ ] Someone owns "who gets paged" if `updates.internal.vng.com.vn`
      goes down (every running app's update check fails silently into
      `state: "error"` — not user-visible, but worth monitoring)

---

## 10. References

- [`docs/release-cicd.md`](./release-cicd.md) — architecture and rationale
- [`.gitlab-ci.yml`](../.gitlab-ci.yml) — the actual pipeline
- [`apps/desktop/src/main/services/updater.ts`](../apps/desktop/src/main/services/updater.ts) — update state machine + policy check
- [`apps/desktop/src/main/ipc/update.ts`](../apps/desktop/src/main/ipc/update.ts) — IPC surface
- [`packages/shared/src/domain/update.ts`](../packages/shared/src/domain/update.ts) — `UpdateStatus`/`UpdatePolicy` schemas
- [`apps/desktop/src/renderer/src/features/updates/`](../apps/desktop/src/renderer/src/features/updates/) — banner + forced dialog UI
