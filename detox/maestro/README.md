# Maestro E2E Tests — Mattermost Mobile

Maestro is a secondary E2E testing layer covering system-level scenarios that Detox cannot handle: share extension, multi-device sync, autocorrect, and calls UI.

---

## When to Use Detox vs Maestro

| Scenario | Tool | Reason |
|---|---|---|
| In-app navigation, taps, form fill | Detox | Full JS bridge access, fast |
| API-driven setup + DB assertions | Detox | Direct WatermelonDB access |
| Share Extension (cross-app flow) | **Maestro** | Detox cannot cross app boundaries |
| System permission dialogs (mic, camera) | **Maestro** | OS-level UI, outside Detox scope |
| Autocorrect / IME behavior | **Maestro** | Native keyboard events required |
| Multi-device message sync | **Maestro** | Requires two separate devices |
| Calls UI (permission + screen present) | **Maestro** | System dialogs + audio session |
| Component unit testing | Jest | Not an E2E concern |

### Decision Flowchart

```text
Does the test cross app boundaries (share sheet, deep link from another app)?
  YES → Maestro
  NO  →
    Does the test need system permission dialogs?
      YES → Maestro
      NO  →
        Does the test require two physical devices simultaneously?
          YES → Maestro (run_two_device.sh)
          NO  →
            Does the test need database-level assertions or mock APIs?
              YES → Detox
              NO  → Either works; prefer Detox for speed
```

---

## Authoring guidelines

See **[GUIDELINES.md](./GUIDELINES.md)** for the flow header contract, comment style,
Maestro platform rules, CLI version pin, CI layout, and the pre-PR checklist.

**TypeScript fixtures:** `npm run check` in this directory runs `tsc --noEmit` against
`fixtures/*.ts` and `lib/env.ts`. `fixtures/calls_seed.ts` is excluded — it imports
Detox `@support/*` helpers and must be type-checked with
`tsx --tsconfig detox/tsconfig.json` (see `run_calls_two_device.sh`).

---

## Setup

### Device targets (local and CI)

Maestro uses the **same simulators and emulators as Detox**. Targets are defined in
`detox/.detoxrc.json` and mirrored in `.github/workflows/e2e-maestro-template.yml`:

| Platform | Device | Notes |
|---|---|---|
| iOS | iPhone 17 Pro, iOS 26.2 | Release simulator build with embedded JS bundle (no Metro in CI) |
| Android | `detox_pixel_8_api_35` (API 35) | Release APK with embedded JS bundle (no Metro in CI) |

### 1. Install Maestro CLI

Version is pinned in [`maestro-version.json`](./maestro-version.json) (currently `2.6.1` at commit `00f516729f57d48f36ded55244cfbe358ada6b00`).

```bash
export MAESTRO_VERSION=$(jq -r .version detox/maestro/maestro-version.json)
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
```

### 2. Install Node dependencies (for seed/poll scripts)

```bash
cd detox/maestro/
npm install
```

### 3. Set environment variables

Flows read the same variables as Detox. For Matterwick cloud servers, use
[`scripts/setup_local.sh`](./scripts/setup_local.sh) (see [Official local workflow](#official-local-workflow)).

Manual exports:

```bash
export SITE_1_URL="https://your-server.test.mattermost.cloud"
export ADMIN_USERNAME="admin"             # username, not email
export ADMIN_PASSWORD="..."
export TEST_USER_EMAIL="testuser@example.com"
export TEST_USER_PASSWORD="User1234!"
export TEST_CHANNEL_NAME="town-square"
export MAESTRO_APP_ID="com.mattermost.rnbeta"   # optional, defaults to rnbeta
```

### 4. Build and install the app

Maestro **does not build the app**. Install a build that matches CI: **release simulator
.app on iOS** and **release APK on Android**, both with `RUNNING_E2E=true` baked into the
JS bundle at build time. See [Building the app for Maestro](#building-the-app-for-maestro).

> **Important:** `RUNNING_E2E` is read via `@env` at **bundle time**. Set `RUNNING_E2E=true`
> in a repo-root `.env` file **before** building — not only when running Maestro.

### 5. Configure the simulator for stable test runs (iOS)

These settings mirror what CI applies automatically. For CI-parity boot, install, and
pre-warm, use [`detox/scripts/preboot_ios_simulator.sh`](../scripts/preboot_ios_simulator.sh)
after placing the `.app` under `mobile-artifacts/`:

```bash
echo "RUNNING_E2E=true" > .env
# Build release sim .app (same as CI build-ios-simulator job):
cd fastlane && bundle exec fastlane ios simulator --env ios.simulator && cd ..
unzip -o Mattermost-simulator-*.app.zip -d mobile-artifacts/

DEVICE_NAME="iPhone 17 Pro" DEVICE_OS_VERSION="iOS 26.2" \
  bash detox/scripts/preboot_ios_simulator.sh
```

Additional local tweaks (optional):

```bash
# Disable auto-correct and predictive text (prevents unexpected input mutations)
xcrun simctl spawn booted defaults write -g KeyboardAutocorrection -bool false
xcrun simctl spawn booted defaults write -g UIKeyboardPrediction -bool false
```

### 6. Seed test data

```bash
# From the repo root (after SITE_1_URL / admin creds are set):
npx tsx detox/maestro/fixtures/seed.ts
source detox/maestro/.maestro-test-env.sh   # exports TEST_USER_EMAIL, TEST_USER_PASSWORD, etc.
```

Or use the all-in-one provision + seed script for Matterwick servers:

```bash
export SITE_URL="https://mobile-pr-XXXX-site-1-XXXX.test.mattermost.cloud"
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD="<from Matterwick PR comment>"
./detox/maestro/scripts/setup_local.sh
source detox/maestro/.maestro-test-env.sh
```

> Maestro's `runScript` command runs in a sandboxed JS environment and cannot execute
> Node.js modules. Always seed via the shell commands above before starting flows.

---

## Official local workflow

End-to-end steps that mirror CI (recommended before opening a Maestro PR):

### iOS

```bash
# 1. Server + seed (Matterwick cloud)
export SITE_URL="https://...site-1....test.mattermost.cloud"
export ADMIN_USERNAME=admin ADMIN_PASSWORD="..."
./detox/maestro/scripts/setup_local.sh
source detox/maestro/.maestro-test-env.sh

# 2. Build + boot simulator (CI-parity)
echo "RUNNING_E2E=true" > .env
cd fastlane && bundle exec fastlane ios simulator --env ios.simulator && cd ..
unzip -o Mattermost-simulator-*.app.zip -d mobile-artifacts/
DEVICE_NAME="iPhone 17 Pro" DEVICE_OS_VERSION="iOS 26.2" \
  bash detox/scripts/preboot_ios_simulator.sh

# 3. Run flows
~/.maestro/bin/maestro test --platform ios detox/maestro/flows/
```

### Android

```bash
# 1. Server + seed (same as iOS)
./detox/maestro/scripts/setup_local.sh
source detox/maestro/.maestro-test-env.sh

# 2. Build release APK + boot emulator (CI-parity)
echo "RUNNING_E2E=true" > .env
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64 && cd ..
cd detox
BOOTSTRAP_ONLY=true MAESTRO_ANDROID=true CI=true \
  ./create_android_emulator.sh 35 detox_pixel_8
cd ..

# 3. Run flows
~/.maestro/bin/maestro test --platform android detox/maestro/flows/
```

Use `-PreactNativeArchitectures=arm64-v8a` (or your device ABI) when testing on a physical
Android device instead of the x86_64 emulator.

### Fast iteration (debug builds)

For quick local iteration you may use debug builds + Metro (`npm run ios` / `npm run android`).
CI always uses release builds with embedded bundles; validate with the official workflow above
before relying on a PR E2E run.

---

## Building the app for Maestro

Maestro has **no build step of its own**. It runs against an app that is already built and
installed. **CI and the official local workflow use release builds with embedded JS bundles**
— the same model as the iOS simulator artifact Detox and Maestro share.

### Summary

| Platform | CI build job | Artifact | Metro at test time? |
|---|---|---|---|
| iOS | `build-ios-simulator` | `ios-build-simulator-<run_id>` (release `.app`) | No — shared with Detox |
| Android (Maestro) | `build-android-apk-maestro` | `android-maestro-build-files-<run_id>` (release APK) | No |
| Android (Detox) | `build-android-apk` | `android-build-files-<run_id>` (debug APK + androidTest) | Yes |

Maestro Android **does not** reuse Detox's debug APK. Detox needs Metro; Maestro uses a
parallel release build (see `.github/actions/build-android-maestro-apk`).

### iOS — local

**CI-parity (recommended):**

```bash
echo "RUNNING_E2E=true" > .env
cd fastlane && bundle exec fastlane ios simulator --env ios.simulator
# Produces Mattermost-simulator-*.app.zip in repo root; unzip to mobile-artifacts/
unzip -o Mattermost-simulator-*.app.zip -d mobile-artifacts/
DEVICE_NAME="iPhone 17 Pro" DEVICE_OS_VERSION="iOS 26.2" \
  bash detox/scripts/preboot_ios_simulator.sh
```

**Quick debug build:** `npm run ios` after `echo "RUNNING_E2E=true" > .env` (Metro required).

### Android — local

**CI-parity (recommended):**

```bash
echo "RUNNING_E2E=true" > .env
cd android
./gradlew assembleRelease -PreactNativeArchitectures=x86_64
adb install -r app/build/outputs/apk/release/app-release.apk
```

Or reuse the Detox emulator bootstrap script (installs APK, grants permissions, pushes
fixtures — same as CI):

```bash
echo "RUNNING_E2E=true" > .env
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64 && cd ..
cd detox
BOOTSTRAP_ONLY=true MAESTRO_ANDROID=true CI=true \
  ./create_android_emulator.sh 35 detox_pixel_8
```

**Do not use** `npm run e2e:android-build` / `app-debug.apk` for Maestro unless Metro is
running with `adb reverse tcp:8081 tcp:8081`. That path is for Detox only.

---

## Running Flows

```bash
# From repo root, after seed + source detox/maestro/.maestro-test-env.sh:

# Run all flows
cd detox/maestro
npm run test:ios          # --platform ios flows/
npm run test:android      # --platform android flows/

# Run a specific suite or single flow
~/.maestro/bin/maestro test --platform ios detox/maestro/flows/calls/call_ui_permission.yml

# Dry-run (validate YAML syntax without executing on a device)
npm run dry-run           # maestro test --dry-run flows/

# Two-device sync test
DEVICE_A_UDID=<udid-a> DEVICE_B_UDID=<udid-b> \
  bash detox/maestro/scripts/run_two_device.sh
```

When multiple simulators are booted, pass `--device <UDID>` (same as CI). After
`preboot_ios_simulator.sh`, use the printed `SIMULATOR_ID`.

### Running on Android

1. **Start the emulator** — use `detox_pixel_8_api_35` to match CI:
   ```bash
   cd detox
   BOOTSTRAP_ONLY=true MAESTRO_ANDROID=true CI=true \
     ./create_android_emulator.sh 35 detox_pixel_8
   ```
   Or ensure any emulator appears in `adb devices` and install the release APK manually.
2. **Seed and env** — `./detox/maestro/scripts/setup_local.sh` then `source detox/maestro/.maestro-test-env.sh`.
3. **Run Maestro** with `--platform android`:
   ```bash
   ~/.maestro/bin/maestro test --platform android detox/maestro/flows/
   ~/.maestro/bin/maestro test --platform android detox/maestro/flows/account/help_url.yml
   ```
   Use `--platform android` when both an iOS simulator and Android emulator are running.

---

## Sub-flow Conventions

Every flow file **must** follow [GUIDELINES.md](./GUIDELINES.md). In short:

1. **Standard header block** — ticket, PRE-CONDITIONS, REQUIRED ENV VARS, ASSERTIONS, testIDs.
2. **Use `subflows/auth/login.yml`** as the first sub-flow to authenticate.
3. **Use `subflows/navigation/navigate_to_channel.yml`** before any channel interaction.
4. **Seed data before the flow, not inside it**: run `npx tsx detox/maestro/fixtures/seed.ts` in the
   shell before invoking Maestro.
5. **Include Zephyr tags**: every flow must declare `tags: [MM-TXXXX]`.
6. **Take a screenshot** at the end of each flow for artifact upload.
7. **Comments describe behavior**, not Detox paths or app implementation details.

### Sub-flow Usage Example

```yaml
appId: ${MAESTRO_APP_ID}
---
- runFlow: ../../subflows/auth/login.yml
- runFlow: ../../subflows/navigation/navigate_to_channel.yml
- tapOn:
    id: "channel.post_draft.post.input"
- inputText: "Hello from Maestro"
- tapOn:
    id: "channel.post_draft.send_action.send.button"
- takeScreenshot: message-sent
```

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `SITE_1_URL` | — | Mattermost server URL (required) |
| `ADMIN_USERNAME` | — | Admin account username (not email) for seeding |
| `ADMIN_PASSWORD` | — | Admin account password for seeding |
| `TEST_USER_EMAIL` | — | Test user email for login |
| `TEST_USER_PASSWORD` | — | Test user password for login |
| `TEST_CHANNEL_NAME` | — | Channel name to navigate to |
| `MAESTRO_APP_ID` | `com.mattermost.rnbeta` | iOS bundle ID or Android package |
| `SYNC_TOKEN` | random 8-char string | Unique token for multi-device sync |
| `DEVICE_A_UDID` | — | UDID of first device (multi-device only) |
| `DEVICE_B_UDID` | — | UDID of second device (multi-device only) |
| `ADMIN_TOKEN` | — | Mattermost personal access token for API polling |
| `TEST_CHANNEL_ID` | — | Channel ID used in `poll_for_message.ts` |

`RUNNING_E2E=true` must be set in repo-root `.env` **before building** the app (not at
Maestro run time). It is baked into the JS bundle via `@env` and suppresses LogBox during E2E.

---

## CI Integration

### Workflows

| Workflow | Purpose |
|---|---|
| `e2e-detox-pr.yml` | Matterwick entry point: builds, provision, Detox + Maestro |
| `e2e-detox.yml` | Detox test runs (reusable; called from `e2e-detox-pr.yml`) |
| `e2e-maestro-pr.yml` | Maestro orchestration + TSIO shard uploads (reusable) |
| `e2e-maestro-template.yml` | Reusable runner: device bootstrap, seed, `maestro test`, reports |

Nightly, release, and CMT workflows call `e2e-maestro-template.yml` directly with
`artifact_run_id: ${{ github.run_id }}` so they download artifacts from the same workflow run.

### Phase 1 — builds (parallel)

| Job | Output artifact | Used by |
|---|---|---|
| `build-ios-simulator` | `ios-build-simulator-<run_id>` | Detox iOS + Maestro iOS |
| `build-android-apk` | `android-build-files-<run_id>` | Detox Android only (debug APK + androidTest) |
| `build-android-apk-maestro` | `android-maestro-build-files-<run_id>` | Maestro Android only (release APK) |
| `provision-servers` | — | Detox + Maestro (license, plugins) |
| `validate-maestro-flow-headers` | — | Maestro (header contract) |

The Maestro Android build runs `.github/actions/build-android-maestro-apk`: sets
`RUNNING_E2E=true` in `.env`, then `./gradlew assembleRelease -PreactNativeArchitectures=x86_64`.
No Detox dependency is installed (see `android/settings.gradle`).

### Phase 2 — tests (parallel)

- **`run-detox`** → `e2e-detox.yml` — downloads debug APK; Android starts Metro + `adb reverse`.
- **`run-maestro`** → `e2e-maestro-pr.yml` → `e2e-maestro-template.yml` — downloads build
  artifacts via `artifact_run_id` from the parent `e2e-detox-pr.yml` run (reusable workflows
  have their own `github.run_id`, so the parent run id must be passed explicitly).

### Device setup in CI (matches Detox)

| Platform | Runner | Bootstrap |
|---|---|---|
| iOS | `macos-26`, iPhone 17 Pro / iOS 26.2 | `preboot_ios_simulator.sh` with `PREBOOT_SKIP_PREWARM=1`, then `listapps` readiness poll |
| Android | `ubuntu-latest-8-cores`, `detox_pixel_8_api_35` | `detox/create_android_emulator.sh` with `BOOTSTRAP_ONLY=true` + `MAESTRO_ANDROID=true` (no Metro) |

### iOS CI runtime (optional parallelization)

Maestro iOS currently runs ~8 sequential batches on one `macos-26` runner (~60+ minutes).
Each batch repeats `login.yml` with `clearState:true`, which dominates wall time.

**Option A — matrix split (recommended if infra approves):** add a `batch-range` input to
`e2e-maestro-template.yml` and run 2–3 parallel macOS jobs (e.g. batches 1–3 / 4–6 / 7–8).
Wall time drops roughly proportionally; runner cost increases. Requires separate JUnit merge
across matrix legs (already supported via `mergeMaestroJunitReports`).

**Option B — smoke gate:** run `account/login.yml` + one channel flow on every PR; run the
full suite only when labeled or on nightly.

**Option C — combine stable batches:** merge attach_logs batches (already split on Android
for isolation). Risk: one wedged flow blocks the whole combined batch.

Discuss Option A with GitHub infra + Maestro owners before enabling — parallel simulators on
one host are not supported; each matrix leg needs its own runner + simulator UDID.

### Test servers (PR runs)

Matterwick provisions `SITE_1_URL`, `SITE_2_URL`, and `SITE_3_URL`. Maestro maps them in
`e2e-maestro-pr.yml`:

- **Maestro iOS** → `SITE_2_URL` (fallback `SITE_1_URL`)
- **Maestro Android** → `SITE_3_URL` (fallback `SITE_1_URL`)

Detox uses `SITE_1_URL` (and additional sites per shard config).

### Default flow sets and exclusions

- Default flow dirs live in `detox/maestro/scripts/run_ci_batches.sh`; override with `FLOW_PATH` or workflow `flow-path` input.
- One flow per `maestro test` batch on iOS and Android.
- `start_call.yml` and `file_type_preview.yml` are **not** in the default PR run (need extra seed scripts).
- `MM-T67856_4` runs in a dedicated CI step with `AllowDownloadLogs=false` patched on the server. Tags excluded from the default batch are listed in `detox/maestro/config/exclude_tags.json` (`default` key) and consumed by `run_ci_batches.sh`. Add a new server-config variant by appending to that array — no script edit required.
- Multi-device sync (`MM-T3055`/`MM-T3056`) requires two physical devices via `run_two_device.sh`.

### Reports

- JUnit XML: `build/maestro-report.xml`
- HTML report + screenshots uploaded to S3 and as GitHub Actions artifacts
- Commit status: `e2e/mobile` (unified Detox + Maestro; posted by `tsio-report-status.js`)

---

## File Structure

```text
detox/maestro/
  package.json                         # Maestro CLI version pin + npm scripts
  README.md                            # This file
  subflows/
    auth/
      login.yml                        # Reusable: app launch + login
      logout.yml                       # Reusable: logout from app
    navigation/
      navigate_to_channel.yml          # Reusable: tap channel in sidebar
      expand_channels_category.yml
      dismiss_scheduled_post_tooltip.yml
    calls/
      join_channel_call.yml
      wait_for_active_call.yml
    waits/
      wait_for_home_tab.yml
      wait_for_server_connect_complete.yml
    server/
      connect_server.yml
    browser/
      dismiss_chrome_interstitial.yml
      reopen_settings_screen.yml
    timezone/
      assert_timezone_region_label.yml
      assert_timezone_region_local.yml
  lib/
    env.ts                             # Env helpers for fixture scripts
    timezone_region.sh                 # Shell helper for timezone CI
  fixtures/
    seed.ts                            # Node script: create team/channel/user via API
    seed_file_preview.ts               # Node script: seed for file_type_preview flows
    calls_seed.ts                      # Node script: seed calls-specific data
    poll_for_message.ts                # Node script: poll API for SYNC_TOKEN message
  flows/
    account/
      attach_logs.yml                  # MM-T3261
      help_url.yml                     # MM-T3260
    calls/
      call_ui_permission.yml           # MM-T1411
      leave_call.yml                   # calls UI
      mute_unmute.yml                  # calls UI
      start_call.yml                   # requires calls_seed.ts (not in default CI run)
    channels/
      channel_bookmark_file.yml        # MM-T5603
      channel_bookmark_file_android_picker.yml  # Android-specific picker variant
      channel_bookmark_file_ios_picker.yml      # iOS-specific picker variant
      channel_bookmark_link_external.yml        # MM-T5604
      file_type_preview.yml            # requires seed_file_preview.ts (not in default CI run)
    multi_device/
      device_a_start_call.yml          # MM-T4830 (two-device calls)
      device_b_join_call.yml           # MM-T4831 (two-device calls)
      user_a_sends_message.yml         # MM-T3055
      user_b_receives_message.yml      # MM-T3056
    timezone/
      clock_display.yml                # MM-T1325
  scripts/
    run_two_device.sh                  # Orchestrate two-device tests
    run_timezone_test.sh               # Timezone test with simctl timezone setup
```
