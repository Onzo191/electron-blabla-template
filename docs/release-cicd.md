# Release & CI/CD Architecture

Target state for shipping the desktop app: source on self-hosted GitLab
(not GitHub), dual distribution (app stores + direct download), and an
update flow that supports both a soft "update available" nudge and a hard
mandatory update. This doc is the source of truth for that pipeline;
`agent-desktop-app-plan.md` Phase 6 points here for detail.

---

## 1. Distribution channels

| Channel | Mac target | Win target | Who controls updates | Review/approval | Good for |
| --- | --- | --- | --- | --- | --- |
| **Direct download** (own site) | `dmg` + `zip` (Developer ID signed + notarized) | `nsis` (EV/OV signed) | Us, via `electron-updater` | None — we ship the moment CI finishes | Fast security patches, forced updates, staged rollout, employees who install from the intranet |
| **Mac App Store** | `mas` (sandboxed, Apple Distribution cert) | — | Apple, via the App Store's own updater | Apple review per release (hours–days) | Discoverability, users who trust/require the Store, simplest install UX |
| **Microsoft Store** | — | `appx`/`msix` (Store-signed or our cert) | Microsoft Store's own updater | Store certification per release (hours–days) | Same as above, on Windows |

**Key constraint driving the whole architecture:** once a build goes
through a store, `electron-updater` is not allowed to self-update it —
Apple requires MAS apps to update only via the App Store, and
`electron-updater` does not support `appx`/`msix` at all (Windows Store
owns that update path). Confirmed against electron-builder's own docs and
issue tracker for both platforms. So the app ships as two build flavors:

- **Store build** (`mas` / `appx`): no in-app updater code runs at all.
  Electron sets `process.mas === true` on macOS and
  `process.windowsStore === true` on Windows automatically at runtime —
  the app uses that flag to skip initializing `electron-updater` entirely
  and to hide the update UI (the Store already tells the user when an
  update is ready).
- **Direct build** (`dmg`/`zip`/`nsis`): full `electron-updater` flow,
  including our own forced-update policy (Section 6).

Both flavors share 100% of the app code; only packaging config and a
runtime feature flag differ. No forked codepaths beyond that.

---

## 2. electron-builder targets & configs

Keep the existing `apps/desktop/electron-builder.yml` as the **direct**
config (already dmg/zip/nsis). Add two overlay configs merged on top of it
via electron-builder's `--config` flag, so store-specific entitlements
never leak into the direct build:

```
apps/desktop/
├── electron-builder.yml          # base: dmg/zip (mac) + nsis (win) — direct channel
├── electron-builder.mas.yml      # overlay: mac target -> mas, sandbox entitlements
├── electron-builder.appx.yml     # overlay: win target -> appx, Store identity
└── build/
    ├── entitlements.mac.plist         # already exists — Developer ID (direct) build
    ├── entitlements.mas.plist         # NEW — sandboxed, MAS build
    └── entitlements.mas.inherit.plist # NEW — inherited sandbox entitlements for MAS
```

New `package.json` scripts (mirroring the existing `build:mac`/`build:win`):

```jsonc
"build:mac:direct": "electron-vite build && electron-builder --mac",
"build:mac:mas": "electron-vite build && electron-builder --mac mas --config electron-builder.mas.yml",
"build:win:direct": "pnpm build && electron-builder --win",
"build:win:store": "pnpm build && electron-builder --win appx --config electron-builder.appx.yml",
```

`electron-builder.mas.yml` sets `mac.type: distribution`,
`mac.provisioningProfile`, `mac.entitlements`/`entitlementsInherit`
pointing at the sandboxed plists, and drops the `publish` block entirely
(no update feed for a Store build — Apple hosts the binary).

`electron-builder.appx.yml` sets `appx.identityName`/`publisher` (from the
Partner Center reservation) and, again, no `publish` block.

---

## 3. Code signing & notarization

| Platform | Direct channel | Store channel |
| --- | --- | --- |
| macOS | Apple **Developer ID Application** cert + **notarization** (`notarytool`, API key auth — doesn't expire, no 2FA prompt, ideal for CI) | Apple **Distribution** cert + provisioning profile, uploaded via `xcrun altool`/`notarytool` + App Store Connect (typically via `fastlane deliver`) |
| Windows | Code-signing cert on the `.exe`/installer. **Azure Trusted Signing is not an option for us** — as of the last policy update it's restricted to businesses with 3+ years of verifiable history in the **US/Canada only**; VNG doesn't qualify. Use a cloud HSM signing service that supports non-US orgs instead: **SSL.com eSigner** or **DigiCert KeyLocker**, both have electron-builder-compatible CLI signing tools usable from CI without a physical USB token plugged into a runner. | Store-signs on ingestion, or reuse the same cert for the appx if pre-signing is required |

Never commit certs/keys to the repo. In GitLab: store them as **protected
+ masked CI/CD variables** or, for binary blobs (`.p12`, provisioning
profiles), GitLab's **Secure Files** feature (Settings → CI/CD → Secure
Files) — files land on the runner at job time and are never printed to
logs.

---

## 4. GitLab CI/CD architecture (self-hosted)

### 4.1 Runners

Self-hosted GitLab needs its own runners registered — there's no
GitHub-Actions-style hosted macOS/Windows fleet. Three runner pools:

| Runner | OS | Used for | Notes |
| --- | --- | --- | --- |
| `docker` (existing shared runner is fine) | Linux | lint/typecheck/test (`pnpm check`) | Cheap, ephemeral, no signing secrets ever touch it |
| `macos` | macOS (Apple Silicon) | mac build, sign, notarize, MAS packaging | Must be a **real Mac** — Mac mini/Studio in-office, or a rented Mac (MacStadium, Scaleway Mac mini, AWS EC2 Mac). Runner must run as a logged-in GUI user (not SSH-only) so it has keychain access for codesign — this is a GitLab Runner-on-macOS requirement, not an electron-builder one. |
| `windows` | Windows | win build, sign, appx packaging | VM or physical Windows machine with the GitLab Runner service + signtool/eSigner CLI installed |

Tag jobs with `tags: [macos]` / `tags: [windows]` and register the
runners with matching tags in the GitLab project/group settings.

### 4.1.1 These should be cloud runners, not anyone's laptop

Where the runners physically live is independent of where GitLab itself
is hosted: a GitLab Runner only opens an outbound HTTPS connection to
poll for jobs — the self-hosted GitLab server never needs to reach back
in. So "self-hosted GitLab" does not mean "the runners must be a machine
in the office" — they can be cloud VMs/hardware, as long as they can
reach the GitLab instance over the network.

This is also what actually solves the concern about a team with many
people on different devices: once these two runners exist, **release
builds never run on a team member's laptop**. Every push/tag goes through
the same dedicated runner regardless of who pushed or what machine they
used — that's the point of CI runners generally, not something specific
to Docker.

- **Windows runner:** an ordinary cloud VM (Windows Server 2022) on
  whatever cloud the team already uses, with GitLab Runner installed as a
  service. Nothing about this needs to be physical hardware. This is
  also exactly why Section 3 recommends SSL.com eSigner / DigiCert
  KeyLocker over a USB signing dongle: those are API-based cloud signing
  services, so signing works identically on a cloud VM as on a physical
  machine — no dongle to plug in.
- **macOS runner:** cannot be an ordinary cloud VM (Apple's license only
  allows virtualizing macOS on genuine Apple hardware), but "genuine
  Apple hardware" doesn't have to mean a Mac mini on someone's desk —
  rent one instead:
  - **MacStadium** — dedicated cloud Mac mini/Studio with a documented
    GitLab Runner setup path; easiest to get running first.
  - **AWS EC2 Mac instances** (`mac2.metal`) — real Apple hardware inside
    AWS if the team is already there; note Apple's licensing forces a
    24-hour minimum allocation per instance, so this suits an always-on
    runner better than spin-up-per-build.
  - **Orka** (also MacStadium) — runs macOS VMs on rented Apple hardware
    more like ephemeral CI runners (spin up per job, tear down after).
    Worth it once build volume justifies it; skip for now.

Start with **one persistent runner per OS**, not an autoscaling fleet —
simpler to operate, and this app won't need more than that for a while.
Revisit autoscaling only if the release queue starts backing up.

**Docker fits some of these, not all.** The `check` job already runs in
`image: node:24` — cheap and disposable, keep it that way. For `build`/
`release`:

- **macOS: never Docker.** Apple's license only allows virtualizing macOS
  on Apple hardware, and Docker doesn't run a macOS kernel at all — the
  mac jobs must run directly on the real Mac runner (shell executor), not
  in a container. This isn't a tooling gap, it's a hard platform
  constraint.
- **Windows: optional.** A Windows container (`docker-windows` executor,
  `mcr.microsoft.com/windows/servercore` base) can work, but the
  container's Windows version has to match the host's closely, and
  passing a signing token/HSM client into a container adds friction for
  no real benefit here. Simplest and recommended: run the Windows build
  directly on the tagged Windows runner (shell executor), same as macOS.
- **Linux, if it's ever added as a target:** Docker is the natural choice,
  same as `check`.

So containerizing the *build* stage doesn't buy much for a Mac+Windows
desktop app specifically — the runners themselves (not Docker) are what
need provisioning.

### 4.2 Pipeline stages

```
check ──► build (smoke, unsigned) ──► release (tag-gated, manual approval)
```

- **`check`** — every push/MR, Linux runner: `pnpm install --frozen-lockfile && pnpm check`. Direct port of today's `.github/workflows/check.yml`.
- **`build`** — every push/MR, mac + windows runners: unsigned packaging (`CSC_IDENTITY_AUTO_DISCOVERY=false`), proves the app still packages on both OSes. Direct port of today's `.github/workflows/build.yml`. Fast feedback, doesn't need secrets.
- **`release`** — only on version tags (`v*`) pushed to `main`, one job per (platform × channel): `release:mac-direct`, `release:mac-mas`, `release:win-direct`, `release:win-store`. Each: real signing + notarization, uploads artifacts, and for the direct channel also **publishes the update feed** (Section 5). Store jobs (`mas`, `appx`) are `when: manual` — App Store/Partner Center submission needs metadata/screenshots managed by a human in the respective console anyway, so CI produces the signed binary and a human triggers/verifies the actual submission (via `fastlane deliver` for MAS, Partner Center Submission API or manual upload for the Store).

A draft `.gitlab-ci.yml` implementing `check` + `build` (the parts that
need no secrets or store accounts yet) is checked into the repo root; the
`release` stage is stubbed with `TODO` markers for secrets/runner tags
until the signing certs and store accounts exist.

### 4.3 Secrets inventory — which job needs a cert, and which doesn't

Not everything in `release` touches a code-signing certificate. Only the
jobs that produce a binary do:

| Job | Needs a cert? | Secrets |
| --- | --- | --- |
| `check` | No | none |
| `build:mac` / `build:win` | No (unsigned smoke build, `CSC_IDENTITY_AUTO_DISCOVERY=false`) | none |
| `release:mac-direct` | **Yes** | `APPLE_API_KEY_ID` / `APPLE_API_ISSUER_ID` / `APPLE_API_KEY_P8` (Secure File, notarization) + `APPLE_DEVELOPER_ID_CERT` (Secure File, `.p12`) + `APPLE_CERT_PASSWORD` |
| `release:mac-mas` | **Yes** | `APPLE_DISTRIBUTION_CERT` + `APPLE_PROVISIONING_PROFILE` (Secure File) |
| `release:win-direct` | **Yes** | `WIN_SIGNING_*` — eSigner/KeyLocker account credentials |
| `release:win-store` | **Yes** | `WINDOWS_STORE_IDENTITY_NAME` / `PUBLISHER` — appx identity (Store re-signs on ingestion, so this is an identity, not a signing cert) |
| `release:publish-update-feed` | No — uploads already-signed files | `UPDATE_FEED_DEPLOY_*` — write credentials for the distribution host |
| `update-policy` (Section 6.1) | **No cert at all** | `RELEASE_API_TOKEN` + `RELEASE_POLICY_API_URL` — a plain API token, since no binary is involved |

The last row is the important distinction: signing certs prove *this
binary came from us*; flipping the forced-update flag doesn't ship a
binary, so it only needs normal API authentication, not a certificate.

---

## 5. Update feed hosting (direct channel only)

Two independent pieces, deliberately not the same host/mechanism:

### 5.1 Binaries + `latest.yml` (electron-updater's own feed)

`electron-updater`'s **generic provider** just does `GET {url}/latest.yml`
(mac: `latest-mac.yml`) then `GET {url}/<file>` for the installer —
electron-builder already generates these automatically when a `publish`
block is present. That means the "server" is nothing more than a static
file host reachable over HTTPS from employee machines. This is large,
immutable, binary traffic — it belongs on an object store, not on the
agentic backend's API servers.

**Recommended: a small internal object storage bucket (MinIO/S3-compatible),
written by the GitLab release job, read by the app.**

```
https://updates.internal.vng.com.vn/agent-desktop/
├── latest/                 # stable channel — what electron-updater polls by default
│   ├── latest.yml
│   ├── latest-mac.yml
│   ├── agent-desktop-1.4.0-setup.exe
│   ├── agent-desktop-1.4.0.dmg
│   └── agent-desktop-1.4.0-mac.zip
└── beta/                   # optional pre-release channel (electron-builder `channel: beta`)
```

`electron-builder.yml`'s `publish` block already exists but points at a
placeholder — replace with the real `latest/` URL once the bucket exists.
This is a same-host swap only, no code change.

Why not just point at GitLab's Generic Package Registry directly: it's
versioned per-package-version by design, so there's no stable "always the
newest" path for `latest.yml` to live at without an extra layer. A
bucket (or GitLab Pages, if traffic is low and internal-only access is
acceptable) that the CI job overwrites at `latest/` is simpler and matches
what electron-updater expects out of the box.

### 5.2 The version-policy check (our own forced-update logic)

This is a **separate HTTP call**, made independently of electron-updater
by `apps/desktop/src/main/services/updater.ts` — a plain `fetch()` against
a URL controlled by `UPDATE_POLICY_URL` (env var, falls back to the bucket
above). Because it's decoupled like this, **it doesn't have to be a static
file at all** — it's a better fit as a real endpoint on the existing
agentic backend (e.g. `GET /desktop/releases/policy`) than as a JSON file
someone remembers to update by hand:

- The backend already has auth, logging, and deploy tooling — no new
  service to stand up.
- It can carry real logic later (staged rollout by cohort, forced update
  tied to a specific breaking API change, telemetry on which versions are
  still checking in) instead of a static value someone edits.
- The desktop app doesn't care either way — it just needs a URL that
  returns the `UpdatePolicy` shape (`packages/shared/src/domain/update.ts`):
  `{ latestVersion, minSupportedVersion, forceUpdate, releaseNotesUrl }`.
  Whoever owns the backend route only needs that contract; no IPC/renderer
  change is required on our side to switch from bucket-file to API.

**Open question for you:** should this route live on the existing
agentic backend, or as a small standalone "release service"? Either
works against the same client code — it only changes what
`UPDATE_POLICY_URL` points to.

**Security baseline for both** (from a review of known Electron
auto-updater compromise patterns):

- HTTPS only, valid cert — never disable TLS verification.
- `electron-updater` already refuses an update whose file hash doesn't
  match `latest.yml`; on Windows it also verifies the download is signed
  by the same publisher (`verifyUpdateCodeSignature`, on by default) — set
  it explicitly and never disable it.
- Downgrades disabled by default (`allowDowngrade: false`) — don't turn
  this on without a specific incident reason.
- The bucket write credentials live only in GitLab CI/CD variables, never
  on a developer machine.

---

## 6. Forced vs. optional update UX

`electron-updater`'s protocol has no built-in "this update is mandatory"
flag — that's a policy decision, not a file-integrity one, so it's layered
on top as our own tiny manifest rather than forked into `latest.yml`:

```json
// update-policy.json — hand-edited or CI-generated per release, sits next
// to latest.yml on the same host
{
  "latestVersion": "1.4.0",
  "minSupportedVersion": "1.2.0",
  "forceUpdate": false,
  "releaseNotesUrl": "https://updates.internal.vng.com.vn/agent-desktop/CHANGELOG.md"
}
```

The app is "forced" when its running version is below
`minSupportedVersion` — e.g. after a breaking backend API change or a
security fix. `forceUpdate: true` is an escape hatch to force everyone
regardless of version (kill-switch for a bad release).

### State machine (main process, `services/updater.ts`)

```
idle → checking → { not-available | available } → downloading → downloaded → (quit & install)
                                                                       ↑
                                                    error ─────────────┘ (retry)
```

Plus a policy check on top: on every status refresh, compare
`app.getVersion()` against the version-policy response (Section 5.2) to
derive `isForced: boolean`.

### Renderer UX

| State | UI |
| --- | --- |
| `available`, not forced | Dismissable Chakra `Toast`/banner: "Update 1.4.0 available — Update & Restart". User can keep working. |
| `downloaded`, not forced | Persistent (but dismissable-until-quit) banner: "Update ready — Restart to apply". Installs automatically on next quit either way (`autoInstallOnAppQuit: true`) even if dismissed. |
| `isForced === true` | Full-screen, non-dismissable Chakra `Dialog` (no close button, Esc disabled, rest of the UI inert behind it): explains why (security/compatibility), single "Update now" button that downloads (if not already) then calls `quitAndInstall`. No skip/defer option — this is the one place the project intentionally blocks the user, because the alternative is an app that can't talk to the backend at all. |
| Store build (`process.mas`/`process.windowsStore`) | No updater UI at all — `electron-updater` is never initialized in this flavor. |

This keeps `electron-updater`'s own advice in mind (industry guidance is
generally "don't force-restart, give the user time") while still allowing
a real kill-switch for the rare security-critical case — the forced dialog
is the exception path, not the default one.

### 6.1 Flipping the flag without a build: the `update-policy` job

Forcing an update is a policy decision, not always a build event — e.g. a
critical bug is found in an *already-shipped* version and every install
below it needs to be forced, with no new binary required. Bundling that
into the normal build+sign+release pipeline would be wrong on two counts:
it'd wait on a full mac+win build/notarization cycle for something that's
really just an API call, and it'd expose code-signing certs to a job that
never touches a binary.

So `update-policy` in `.gitlab-ci.yml` is deliberately separate:

- **No cert, no build** — its only credential is `RELEASE_API_TOKEN`, a
  plain bearer token for the policy endpoint (Section 5.2), not a
  signing certificate (see the table in Section 4.3).
- **Not triggered by push or tag** — `rules: if: $CI_PIPELINE_SOURCE ==
  "web"` means it only appears when someone manually starts a pipeline
  from GitLab's UI (CI/CD → Pipelines → "Run pipeline") and fills in
  `MIN_SUPPORTED_VERSION` (required) and `FORCE_UPDATE` (optional) as
  pipeline variables. A routine `git push` never runs it. GitLab doesn't
  have a clean concept of "a second, independent pipeline file" in one
  project — gating a job to `web`-sourced pipelines is the practical way
  to get the same effect (an on-demand, decoupled action) without
  maintaining a second CI config.
- **Idempotent and reversible** — it's just overwriting a JSON field on
  the policy endpoint, so re-running it with different values (including
  turning `forceUpdate` back off) is always safe.

---

## 7. Release process

- **Versioning:** SemVer, bump in `apps/desktop/package.json`. A pushed
  tag `vX.Y.Z` on `main` (protected branch + protected tag pattern in
  GitLab) triggers the `release` stage.
- **Channels:** `latest` (stable, default) and optionally `beta` for an
  internal dogfood ring before promoting to `latest` — electron-builder's
  `channel`/`-c.publish.channel` support this without extra work.
- **Rollback:** because installers are immutable per version, "rollback"
  = re-point `latest.yml` at the previous version's files (CI job,
  `when: manual`) — since `allowDowngrade` is off by default client-side,
  document that this is an emergency-only, main-branch-authorized action.
- **Store submissions stay a human-gated step** (manual GitLab job that
  hands the signed artifact to `fastlane`/Partner Center) — CI's job is to
  produce a trustworthy, reproducible, signed artifact, not to click
  "Submit for review".

---

## 8. Open items needing a decision from you / IT before `release` goes live

1. Apple Developer **organization** account (for Developer ID + MAS) and
   Apple Business/App Store Connect access — who owns/pays for it.
2. Microsoft **Partner Center** developer account for the Store listing.
3. Windows code-signing: pick SSL.com eSigner vs. DigiCert KeyLocker (both
   support non-US orgs; compare pricing/CI ergonomics).
4. Cloud **macOS runner** for GitLab — pick a vendor (MacStadium vs. AWS
   EC2 Mac vs. Orka; see Section 4.1.1) and get it provisioned; the
   Windows runner is just a VM on whatever cloud the team already uses,
   so it's not blocked on a decision the same way.
5. Hosting for `updates.internal.vng.com.vn` (binaries + `latest.yml`
   only — MinIO on existing infra vs. GitLab Pages vs. a cloud bucket) and
   whether it needs to be reachable off-VPN (remote/WFH employees).
6. Who owns the version-policy endpoint (Section 5.2): a new route on the
   existing agentic backend, or a standalone release service.

---

## 9. Mapping onto `agent-desktop-app-plan.md`

This doc supersedes the CI line in Section 2.2 (`GitHub Actions` →
self-hosted `GitLab CI`) and expands Phase 6 (Packaging & Release) with:
dual-channel builds, the update-policy manifest, and the forced-update
dialog. See that file for the phase checklist; this file owns the "how".
