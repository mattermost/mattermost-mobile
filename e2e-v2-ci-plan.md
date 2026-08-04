# Mobile E2E CI v2 — Plan (Detox + Maestro + test-system-io)

> **Status:** Living plan — committed at repo root (`e2e-v2-ci-plan.md`).
> **Branch:** `cursor/e2e-v2-test-system-io-orchestration-2a12`
> **Do not open a PR** until the pipeline is proven on staging (avoids triggering legacy CI labels/Matterwick).
> **Rule:** Never modify existing `.github/workflows/e2e-*.yml`, `compatibility-matrix-testing.yml`, or existing v1 test-system-io helper scripts under `detox/utils/` (e.g. `build-tsio-job-config.js`, `tsio-report-status.js`). New work lives under `*v2*` paths only.
> **Naming:** Prefer the full product name **test-system-io** in docs, inputs, paths, and comments. Do not introduce `tsio` / `TSIO` abbreviations in new v2 artifacts.

---

## 1. Goals

Reimagine mobile E2E CI as **version 2**, built around reusable actions from
[`mattermost/mattermost-test-system-io`](https://github.com/mattermost/mattermost-test-system-io):

| Goal | Detail |
|------|--------|
| Orchestration-first | Use `test-system-io-dispatch-begin` → `dispatch-run` → `summary`. No custom test-system-io client scripts. |
| No test-system-io glue in-repo | No new scripts that mint OIDC, call `/reports/*` or `/orchestration/*`, merge shard JSON for upload, or compute report URLs / commit-status payloads that test-system-io actions already own. |
| Staging first | All v2 runs target `https://staging-test-io.test.mattermost.com` via `use-staging: "true"`. |
| UI-runnable | Primary trigger is `workflow_dispatch` with friendly `choice` / boolean inputs so humans can run from the Actions UI. |
| PR-shaped, extensible | Identity / naming / inputs designed for PR now; later `run_type` / trigger adapters for main, release, CMT without rewriting workers. |
| Leave v1 alone | Existing Matterwick E2E (`e2e-detox-pr.yml` et al.) stays untouched until a later cleanup cutover. |

### Non-goals (this iteration)

- Replacing Matterwick label automation
- Production test-system-io (`test-io.test.mattermost.com`)
- Zephyr / S3 HTML report / channel webhook parity with v1 (can follow later)
- Editing `detox/` test bodies unless a real test failure requires it

---

## 2. Why v2 (problems with v1)

Current PR E2E (`e2e-detox-pr.yml` → templates):

1. **Fixed shard matrix** (20/20/1) — mobile owns packing; test-system-io only gets post-hoc `report-upload`.
2. **Heavy in-repo test-system-io glue** — v1 helpers such as `build-tsio-job-config.js`, `merge-jest-results-for-tsio.js`, `maestro_report.js`, `tsio-report-status.js`, failure stubs.
3. **Matterwick-owned server create/delete** — workflow only validates URLs + runs `npm run provision` (license/plugins). Hard to iterate without Matterwick.
4. **Build always on the critical path** — no first-class “reuse last good artifacts” mode for pipeline debugging.
5. **Maestro is batch-in-one-job** — does not use the test-system-io orchestration queue (Detox orchestration already on test-system-io `main`; Maestro orchestration is [PR #102](https://github.com/mattermost/mattermost-test-system-io/pull/102)).

v2 flips ownership: **test-system-io discovers specs, leases units, uploads shard reports, and flips commit status**. Mobile CI only prepares the device stack, builds (or reuses) the app, points workers at servers, and invokes the composites.

---

## 3. Dependencies & pins

| Dependency | Pin strategy |
|------------|--------------|
| Detox orchestration | `mattermost/mattermost-test-system-io` **main** — SHA `2d15ae40a9f133d12a4024151826e52226f742a2` (or newer main with Detox) |
| Maestro orchestration | [PR #102](https://github.com/mattermost/mattermost-test-system-io/pull/102) branch `feat-maestro` — SHA `e9ac8e96129611116ead159de1fee99895402f71` until merge; then retarget to merged main SHA |
| Staging test-system-io | `https://staging-test-io.test.mattermost.com` — ensure PR #102 (migration `000026` for `maestro`) is **deployed to staging** before Maestro v2 jobs |
| Existing mobile actions (reuse, do not rewrite) | `prepare-ios-build`, `prepare-android-build`, `prepare-node-deps`, `build-android-maestro-apk`, etc. |

Pin format in workflows:

```yaml
uses: mattermost/mattermost-test-system-io/.github/actions/test-system-io-dispatch-begin@<40-char-sha>
```

---

## 4. Target architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  e2e-v2-servers.yml          (create / configure / verify / delete)     │
│  • create cloud installs     ← COMMENTED during iteration               │
│  • npm run provision         (license + plugins — reuse detox/provision)│
│  • health-check /api/v4      → log URLs to summary + artifact           │
│  • delete cloud installs     ← COMMENTED during iteration               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  URLs (manual input or artifact reuse)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  e2e-v2.yml                  (workflow_dispatch entry — UI friendly)    │
│  inputs: framework, platform, skip_build, artifact_run_id, servers, …   │
│                                                                         │
│  resolve → [build*] → verify-servers → begin → workers → summary        │
│                                                                         │
│  * build skipped when skip_build=true && artifact_run_id set            │
└─────────────────────────────────────────────────────────────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
   build-ios-v2 /            dispatch-begin             dispatch-run
   build-android-*-v2        (staging test-system-io)   matrix workers
   → upload artifacts        → report-url               (sim/emu + Metro)
                             → total-units                    │
                                                              ▼
                                                   summary (test-system-io)
```

### Extensibility hooks (later CI flavors)

Keep a single internal contract so future triggers are thin adapters:

| Future trigger | Adapter | Same workers? |
|----------------|---------|---------------|
| PR (`workflow_dispatch` / later `pull_request`) | `run_type=PR`, `gh_pr_number`, branch = PR head | Yes |
| Merge to main | `run_type=MAIN`, branch = `main` | Yes |
| Merge to release | `run_type=RELEASE`, branch = `release-*` | Yes |
| CMT | Matrix over `server_version` × platform; narrower `detox-search-path` for smoke | Yes |

Composite identity `name` stays stable per logical job, e.g.:

- `mobile-v2-pr-detox-ios`
- `mobile-v2-pr-detox-ipad`
- `mobile-v2-pr-detox-android`
- `mobile-v2-pr-maestro-ios`
- `mobile-v2-pr-maestro-android`

Later swap `pr` → `main` / `release` / `cmt-<version>` without changing worker YAML.

Commit-status contexts (v2-prefixed to avoid colliding with v1):

- `e2e-test-v2/detox-ios`
- `e2e-test-v2/detox-ipad`
- `e2e-test-v2/detox-android`
- `e2e-test-v2/maestro-ios`
- `e2e-test-v2/maestro-android`

---

## 5. Proposed file layout (new only)

```text
.github/
├── workflows/
│   ├── e2e-v2.yml                      # UI entry: build + orchestrated test
│   ├── e2e-v2-servers.yml              # create / provision / verify / delete
│   ├── e2e-v2-detox.yml                # reusable workflow_call — Detox platform fan-out
│   ├── e2e-v2-maestro.yml              # reusable workflow_call — Maestro (after #102)
│   ├── e2e-v2-detox-ios.yml            # iOS phone worker template (or jobs inside detox.yml)
│   ├── e2e-v2-detox-ipad.yml           # iPad worker template
│   └── e2e-v2-detox-android.yml        # Android worker template
└── actions/                            # ONLY if a step is pure mobile setup (no test-system-io)
    └── e2e-v2-prepare-ios-runner/      # optional composite: brew, detox deps, sim boot
    └── e2e-v2-prepare-android-runner/  # optional composite: AVD create/boot

e2e-v2-ci-plan.md                       # THIS FILE (repo root)
```

Prefer **workflows over new actions** until a step is clearly duplicated ≥2 times.
Existing `prepare-*-build` actions may be *called* from v2; do not modify them.

**Naming:** all new workflow names and artifact prefixes use `v2` / `e2e-v2` so cutover cleanup is a delete of the old set, then rename/drop the suffix.

---

## 6. Workflow contracts

### 6.1 `e2e-v2-servers.yml` — server lifecycle (separate pipeline)

**Trigger:** `workflow_dispatch` only.

| Input | Type | Purpose |
|-------|------|---------|
| `action` | `choice`: `create_and_configure` \| `configure_only` \| `verify` \| `delete` | What to do |
| `server_version` | string | Cloud image / MM version (for create) |
| `android_site_1_url` … `site_3_url` | string | For configure/verify/delete when create is skipped |
| `count` | number default `5` | Topology size (document 5-slot layout) |

**Jobs (logic present; create/delete commented during iteration):**

1. **`create`** (commented body + big banner comment)
   - Placeholder steps that would call Mattermost Cloud / Matterwick-equivalent API to spin 5 installs.
   - When uncommented: write URLs to job outputs + upload `e2e-v2-server-urls.json` artifact.
   - **During iteration:** leave create disabled; paste known-good URLs into `configure_only` / `verify` / main E2E inputs.

2. **`configure`** — always runnable
   - Allowlist HTTPS validation (copy pattern from v1, new file — do not edit v1).
   - `cd detox && npm ci && npm run provision -- <url>` for each unique URL.
   - Uses existing secrets: `MM_MOBILE_E2E_ADMIN_*`.

3. **`verify`** — always runnable before tests
   - `GET {url}/api/v4/system/ping` (and optionally login with admin) for each URL.
   - Fail fast if any server is unreachable.
   - Print URLs into `$GITHUB_STEP_SUMMARY` for copy-paste into `e2e-v2.yml`.

4. **`delete`** (commented body)
   - Placeholder for cloud install teardown.
   - Document: run manually once servers are burned / expired.

**Success criteria for this workflow:** configure + verify green against a stable set of URLs; URLs logged and reusable across many `e2e-v2` iterations.

### 6.2 `e2e-v2.yml` — main entry (UI-friendly)

**Trigger:** `workflow_dispatch` (primary). Structure inputs so adding `pull_request` / `push` later is additive.

| Input | Default | Notes |
|-------|---------|-------|
| `mobile_ref` | `${{ github.sha }}` / branch tip | Commit/ref to test |
| `framework` | `detox` | `detox` \| `maestro` \| `both` |
| `platform` | `ios` | `ios` \| `ipad` \| `android` \| `ios_and_ipad` \| `all` — start narrow |
| `skip_build` | `false` | When true, download artifacts from `artifact_run_id` |
| `artifact_run_id` | `""` | Prior successful build’s `github.run_id` |
| `worker_count` | `2` (bootstrap) → raise toward ~10–20 | = `total-reports-expected` |
| `detox_search_path` | `e2e/test` or smoke path | Narrow for first green |
| `use_staging_test_system_io` | `true` | Hard default true for v2 |
| `android_site_1_url` … `site_3_url` | required when running tests | From server pipeline / manual |
| `pr_number` | optional | For identity + commit status on a PR SHA |
| `run_type` | `PR` | Hook for later MAIN/RELEASE/CMT |

**Job graph (phased enablement via `if:`):**

```text
resolve-inputs
    ├─ build-ios-simulator-v2      (if platform needs ios/ipad && !skip_build)
    ├─ build-android-detox-v2      (if platform needs android detox && !skip_build)
    ├─ build-android-maestro-v2    (later; maestro android)
    └─ verify-servers              (always before tests)
         └─ run-detox-ios-v2       → begin + workers + summary
         └─ run-detox-ipad-v2
         └─ run-detox-android-v2
         └─ run-maestro-*          (later phase)
```

**Artifact names (stable, include run_id):**

- `e2e-v2-ios-simulator-{run_id}`
- `e2e-v2-android-detox-{run_id}`
- `e2e-v2-android-maestro-{run_id}`

When `skip_build=true`, download from `artifact_run_id` (requires `actions: read` + token).

### 6.3 Detox worker job (per platform)

Each platform reusable workflow / job:

1. Checkout `mobile_ref`
2. Download app artifact
3. Install detox deps / brew / framework cache (mobile setup only)
4. Boot simulator or AVD; start Metro for debug Detox
5. Export `SITE_1_URL` / `SITE_2_URL` / `SITE_3_URL` (and admin env) for tests
6. **Do not** call custom test-system-io scripts
7. Matrix of N workers, each calling:

```yaml
- uses: mattermost/mattermost-test-system-io/.github/actions/test-system-io-dispatch-run@<sha>
  with:
    framework: detox
    use-staging: "true"
    composite-identity: ${{ needs.begin.outputs.identity }}
    repo-dir: ${{ github.workspace }}
    artifacts-root: ${{ runner.temp }}/test-system-io
    github-token: ${{ secrets.GITHUB_TOKEN }}
    gh-job-name: ${{ job.name }}   # MUST match job name:
    detox-dir: detox
    detox-config: ios.sim.debug    # or ios.ipad.debug / android.emu.debug
```

Controller job (once):

```yaml
- uses: .../test-system-io-dispatch-begin@<sha>
  with:
    framework: detox
    use-staging: "true"
    total-reports-expected: ${{ inputs.worker_count }}
    detox-search-path: ${{ inputs.detox_search_path }}
    detox-exclude-dir: ipad   # empty for iPad-only job
    commit-status-context: e2e-test-v2/detox-ios
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

Finalizer:

```yaml
- uses: .../test-system-io-summary@<sha>
  if: always()
  with:
    framework: detox
    use-staging: "true"
    commit-status-context: e2e-test-v2/detox-ios
    fail-on-test-failures: "true"   # relax only while bootstrapping
```

**Permissions on caller:** `id-token: write`, `contents: read`, `actions: read`, `statuses: write`.

### 6.4 Maestro (after Detox is green)

Same shape; pin actions to PR #102 SHA until merge:

- `framework: maestro`
- `maestro-dir: detox/maestro`
- `maestro-flow-path: flows`
- `maestro-exclude-dir: multi_device`
- Workers pass `maestro-platform`, `maestro-device`, `maestro-env` (`SITE_1_URL=…` lines)
- Release Android APK + iOS sim build with `RUNNING_E2E=true` (no Metro)

---

## 7. Staged delivery (execution order)

Each stage ends with: **success criteria met → commit (not the plan) → push → dispatch workflow from UI → watch → fix → iterate**.

### Stage 0 — Scaffold (this plan + empty workflows)

- [x] Branch exists: `cursor/e2e-v2-test-system-io-orchestration-2a12`
- [x] Plan file at repo root (`e2e-v2-ci-plan.md`)
- [x] Add `e2e-v2.yml` + `e2e-v2-servers.yml` (+ `e2e-v2-detox-ios.yml`) with `workflow_dispatch`
- [x] Push branch (**no PR**); dispatch scaffold from Actions UI
- **Success:** Actions UI lists “E2E v2” and “E2E v2 Servers”; manual dispatch runs green scaffold

### Stage 1 — Test servers (configure + verify; create/delete commented)

- [x] Implement URL validation + `npm run provision` + ping verify (`e2e-v2-servers.yml`)
- [x] Create/delete steps written but disabled; document how to paste URLs
- [ ] Run once; save URLs in run summary / artifact for reuse
- **Success:** verify job green; URLs reusable for Stage 2+

### Stage 2 — Environment + iOS Detox build

- [x] `build-ios-simulator-v2` job (reuse `prepare-ios-build` + fastlane simulator)
- [x] Upload `e2e-v2-ios-simulator-{run_id}`
- [ ] Prove build green via UI dispatch; note `run_id` for `skip_build`
- **Success:** artifact downloadable; note `run_id` for `skip_build`

### Stage 3 — Detox iOS ↔ staging test-system-io (orchestration)

- [x] `dispatch-begin` / worker matrix / `summary` for Detox iOS (`e2e-v2-detox-ios.yml`)
- [x] Defaults: `worker_count=2`, `detox_search_path=e2e/test/products/channels/smoke_test`
- [x] `skip_build=true` + prior artifact (`artifact_run_id=30898279916`)
- [x] Confirm report appears on staging dashboard
- [x] Smoke green after autofill-v2 Save Password disable (run `30912082541`: 25 passed / 0 failed / 4 skipped)
- **Success:** staging report URL in summary; majority (or all) of the narrowed suite green

### Stage 4 — Widen Detox iOS

- [ ] Raise workers; point `detox_search_path` at full `e2e/test` with `detox-exclude-dir: ipad`
- [ ] Drive toward majority green; triage flakes vs env
- **Success:** majority of Detox iOS suite green on staging orchestration

### Stage 5 — Detox iPad

- [x] Separate begin/workers with `detox-search-path: e2e/test/products/channels/ipad`, `detox-exclude-dir: ""`, `detox-config: ios.ipad.debug` (`run-detox-ipad-v2` job)
- [x] Reuse same iOS simulator artifact (`30898279916`)
- [ ] **Success:** iPad job green or majority green

### Stage 6 — Detox Android

- [ ] Android debug APK build job + artifact
- [ ] AVD boot + orchestration workers (`android.emu.debug`)
- [ ] Same staging test-system-io pattern
- **Success:** build artifact reusable; majority Android Detox green

### Stage 7 — Maestro (requires #102 on staging)

- [ ] Confirm staging has Maestro orchestration migration
- [ ] Pin actions to `feat-maestro` SHA (or merged main)
- [ ] Maestro iOS then Android
- **Success:** Maestro reports on staging; majority green

### Stage 8 — Polish & extensibility

- [ ] Document UI runbook (inputs matrix)
- [ ] Ensure `run_type` / identity naming ready for main/release/CMT adapters
- [ ] Optionally add thin `workflow_call` wrappers for those flavors (still v2-named)
- [ ] Only then consider opening a PR

---

## 8. What must NOT appear in v2

| Forbidden | Why |
|-----------|-----|
| New test-system-io client/merge/upload helpers under `detox/utils/` | test-system-io actions own this |
| Calling `test-system-io-report-upload` **and** `dispatch-run` for the same shard | Double upload |
| Editing `e2e-detox-pr.yml`, templates, CMT, label-manager | Parallel v1 must keep working |
| Hardcoding production test-system-io URL | Staging-only until cutover |
| New `tsio` / `TSIO` abbreviations in v2 names, inputs, paths, or comments | Use **test-system-io** |

Allowed mobile-side scripts: existing `detox/provision`, `create_android_emulator.sh`, `preboot_ios_simulator.sh`, `run_detox.sh` — these are **test runtime / server config**, not test-system-io integration.

---

## 9. Secrets & permissions

Reuse existing repo secrets (names only):

- `MM_MOBILE_E2E_ADMIN_USERNAME` / `_PASSWORD` / `_EMAIL`
- `MM_MOBILE_GITHUB_TOKEN` (build)
- Android store secrets for release/maestro APK when needed
- `MM_MOBILE_INTUNE_DEPLOY_KEY` if Intune path ever enabled (`INTUNE_ENABLED=false` for v2)

No new test-system-io API keys — OIDC via `id-token: write`, audience `mattermost-test-system-io`.

Cloud create/delete (when uncommented) will need whatever Cloud/Matterwick credentials the org already uses; document the secret names in the servers workflow comments when wiring becomes available. Until then, URLs are manual inputs.

---

## 10. Risk register

| Risk | Mitigation |
|------|------------|
| PR #102 not on staging | Detox-only until staging deploy; Maestro stage blocked explicitly |
| Orchestration lease timeouts vs long Detox specs | Start with smoke path; tune `lease-timeout-ms` / `idle-timeout-ms` on begin |
| Metro / sim not ready before first lease | Prepare-runner steps before `dispatch-run`; fail fast on boot |
| Accidental create storms | Create/delete commented; configure_only + verify for iteration |
| Pushing branch triggers unexpected CI | No PR; v2 workflows are `workflow_dispatch` only; do not add `pull_request` until ready |
| Identity collision with v1 | `mobile-v2-*` names + `e2e-test-v2/*` contexts |

---

## 11. Immediate next actions

1. ~~Stage 0–3 scaffolding + smoke Detox iOS on staging~~ (done; smoke 25p/0f).
2. ~~Stage 4 phone widen~~ (majority green @ 20 workers; residual failures filtered separately).
3. **Stage 5:** Detox iPad (`e2e/test/products/channels/ipad`, `ios.ipad.debug`, exclude `""`).
4. Next: Stage 6 Android → Stage 7 Maestro.

---

## 12. Reference links

- Staging test-system-io: https://staging-test-io.test.mattermost.com/
- Maestro PR: https://github.com/mattermost/mattermost-test-system-io/pull/102
- Actions (main): `.github/actions/test-system-io-dispatch-{begin,run}`, `test-system-io-summary`, `test-system-io-report-upload`
- Example curl orchestration (docs only): `mattermost-test-system-io/docs/orchestration-example-workflow.yml`
- v1 entry (do not edit): `.github/workflows/e2e-detox-pr.yml`
