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

```
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
Maestro platform rules, CLI version pin, CI layout, and the AI evaluation checklist.

---

## Setup

### 1. Install Maestro CLI

Version is pinned in [`maestro-version.json`](./maestro-version.json) (currently `2.3.0` at commit `f3dd692`).

```bash
export MAESTRO_VERSION=$(jq -r .version maestro/maestro-version.json)
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
```

### 2. Install Node dependencies (for seed/poll scripts)

```bash
cd maestro/
npm install
```

### 3. Set environment variables

All flows use the same environment variables as Detox:

```bash
export SITE_1_URL="http://localhost:8065"
export ADMIN_USERNAME="admin"             # username, not email
export ADMIN_PASSWORD="Admin1234!"
export TEST_USER_EMAIL="testuser@example.com"
export TEST_USER_PASSWORD="User1234!"
export TEST_CHANNEL_NAME="town-square"
export MAESTRO_APP_ID="com.mattermost.rnbeta"   # optional, defaults to rnbeta
```

### 4. Build and install the app

Maestro **does not build the app**. Flows run against whatever app is already installed on the simulator or device. See [Building the app for Maestro](#building-the-app-for-maestro) below for options.

**Quick local option:** from the repo root, set `RUNNING_E2E=true` in `.env` (required to suppress the LogBox red screen that otherwise blocks tests), then build and install on the booted simulator:

```bash
echo "RUNNING_E2E=true" > .env
npm run ios   # starts Metro and installs the debug build
```

### 5. Configure the simulator for stable test runs (iOS)

These settings mirror what CI applies automatically. They prevent flakiness from system
dialogs and animations interfering with flows:

```bash
# Disable auto-correct and predictive text (prevents unexpected input mutations)
xcrun simctl spawn booted defaults write -g KeyboardAutocorrection -bool false
xcrun simctl spawn booted defaults write -g UIKeyboardPrediction -bool false

# Disable slow animations (optional but makes flows faster locally)
xcrun simctl spawn booted defaults write com.apple.UIKit UIAnimationDragCoefficient 0.01

# Grant location permission to the app (avoids unexpected dialog mid-test)
xcrun simctl privacy booted grant location-always com.mattermost.rnbeta

# Grant photo library permission (required for share_image_to_channel)
xcrun simctl privacy booted grant photos com.mattermost.rnbeta
```

### 6. Seed test data

```bash
# From the repo root:
npx tsx maestro/fixtures/seed.ts
source .maestro-test-env.sh   # exports TEST_USER_EMAIL, TEST_USER_PASSWORD, etc.
```

> **Note**: `maestro/utils/setup.yml` is a placeholder — it does NOT run the seed script.
> Maestro's `runScript` command runs in a sandboxed JS environment and cannot execute
> Node.js modules. Always seed via the shell command above before starting flows.

---

## Building the app for Maestro

Maestro has **no build step of its own**. It only runs against an app that is already built and installed. You can use the same app build you use for development or for Detox.

### Summary

| | Maestro builds the app? | Can use Detox build? |
|---|------------------------|----------------------|
| **Answer** | **No** — you must build/install separately | **Yes** — same `.app` / APK works for both |

### Local runs

- **Option A (simplest):** From the repo root, build and install once, then run Maestro:
  ```bash
  npm run ios   # build and install on the default booted simulator
  maestro test maestro/flows/
  ```
- **Option B (reuse Detox build):** If you already built the app for Detox (e.g. `cd detox && npm run e2e:ios-build`), install that build on the simulator and run Maestro against it. No separate Maestro build is needed.
- **Pre-built `.app`:** To install an existing build manually:
  ```bash
  xcrun simctl install booted path/to/Mattermost.app
  ```

### CI

The Maestro workflow (`.github/workflows/e2e-maestro-template.yml`) **does not compile the app**. It downloads an artifact named `ios-build-simulator-${{ github.run_id }}` — the **same artifact name** used by the Detox iOS simulator build. The workflow that triggers Maestro must build the iOS app (same process as for Detox), upload that artifact, then call the Maestro template. So in CI, **one iOS build is used for both Detox and Maestro**; there are no separate build steps for Maestro.

---

## Running Flows

```bash
# Run all flows
cd /path/to/mattermost-mobile
npm run test:ios          # targets iOS simulator (explicit --platform ios)
npm run test:android      # targets Android emulator (explicit --platform android)

# Run a specific suite or single flow by passing the path directly
maestro test --platform ios maestro/flows/share_extension/
maestro test --platform ios maestro/flows/calls/call_ui_permission.yml

# Dry-run (validate YAML syntax without executing on a device)
npm run dry-run           # equivalent to: maestro test --dry-run maestro/flows/

# Two-device sync test
DEVICE_A_UDID=<udid-a> DEVICE_B_UDID=<udid-b> \
  bash maestro/scripts/run_two_device.sh
```

### Running on Android

1. **Start an Android emulator** (or connect a device) and ensure it appears in `adb devices`.
2. **Build and install the app** (Maestro does not build; use one of these):
   ```bash
   npm run android   # from repo root — builds and installs debug APK on default emulator
   ```
   Or build the Detox APK and install it:
   ```bash
   cd detox && npm run e2e:android-inject-settings && npm run e2e:android-build
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
3. **Set env vars** (e.g. `SITE_1_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_CHANNEL_NAME`). Optionally run `npx tsx maestro/fixtures/seed.ts` and `source .maestro-test-env.sh`.
4. **Run Maestro** with `--platform android` so it targets the Android device instead of iOS:
   ```bash
   maestro test --platform android maestro/flows/
   maestro test --platform android maestro/flows/account/help_url.yml
   maestro test --platform android maestro/flows/channels/
   ```
   If only one device is connected, Maestro may pick it automatically; use `--platform android` when both an iOS simulator and an Android emulator are running.

---

## Sub-flow Conventions

Every flow file **must** follow [GUIDELINES.md](./GUIDELINES.md). In short:

1. **Standard header block** — ticket, PRE-CONDITIONS, REQUIRED ENV VARS, ASSERTIONS, testIDs.
2. **Use `utils/login.yml`** as the first sub-flow to authenticate.
3. **Use `utils/navigate_to_channel.yml`** before any channel interaction.
4. **Seed data before the flow, not inside it**: run `npx tsx maestro/fixtures/seed.ts` in the
   shell before invoking Maestro.
5. **Include Zephyr tags**: every flow must declare `tags: [MM-TXXXX]`.
6. **Take a screenshot** at the end of each flow for artifact upload.
7. **Comments describe behavior**, not Detox paths or app implementation details.

### Sub-flow Usage Example

```yaml
appId: ${MAESTRO_APP_ID}
---
- runFlow: ../../utils/login.yml
- runFlow: ../../utils/navigate_to_channel.yml
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

---

## CI Integration

| Workflow | Purpose |
|---|---|
| `e2e-maestro-pr.yml` | Maestro orchestration (status checks, platform jobs, final status) |
| `e2e-maestro-template.yml` | Reusable runner (device setup, seed, `maestro test`, reports) |
| `e2e-detox-pr.yml` | Detox + calls `e2e-maestro-pr.yml` with shared iOS build artifact |

- **PR gate**: Matterwick dispatches `e2e-detox-pr.yml`, which runs Detox and delegates Maestro to `e2e-maestro-pr.yml`. Maestro iOS uses `SITE_2_URL`; Android uses `SITE_3_URL`.
- **Standalone Maestro**: `workflow_dispatch` on `e2e-maestro-pr.yml`.
- **On-demand / nightly / release**: Other workflows call `e2e-maestro-template.yml` directly.

Additional CI notes:

- All PR flows run on an **iOS simulator** (iPhone 17 Pro, iOS 26.2) on `macos-26` runners and on an **Android emulator** (API 34) on `ubuntu-latest-8-cores`. No real devices needed for CI.
- `start_call.yml` and `file_type_preview.yml` are **excluded from the default CI run** because they require separate seed scripts (`calls_seed.ts`, `seed_file_preview.ts`) that are not part of the standard PR setup.
- Multi-device sync tests (`MM-T3055`/`MM-T3056`) require two physical devices and are run separately via `maestro/scripts/run_two_device.sh`.
- JUnit XML reports are written to `build/maestro-report.xml` and uploaded as CI artifacts.

---

## File Structure

```
maestro/
  package.json                         # Maestro CLI version pin + npm scripts
  README.md                            # This file
  utils/
    login.yml                          # Reusable: app launch + login
    logout.yml                         # Reusable: logout from app
    navigate_to_channel.yml            # Reusable: tap channel in sidebar
    setup.yml                          # Placeholder — seed via shell (see Setup §6)
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
    share_extension/
      share_image_to_channel.yml       # MM-T2862
      share_text_to_channel.yml        # MM-T2863
      share_link_to_channel.yml        # MM-T2874
    timezone/
      clock_display.yml                # MM-T1325
  scripts/
    run_two_device.sh                  # Orchestrate two-device tests
    run_timezone_test.sh               # Timezone test with simctl timezone setup
```
