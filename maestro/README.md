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

## Setup

### 1. Install Maestro CLI

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
# Adds ~/.maestro/bin to PATH
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version  # should print 1.38.1
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
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="Admin1234!"
export TEST_USER_EMAIL="testuser@example.com"
export TEST_USER_PASSWORD="User1234!"
export MAESTRO_APP_ID="com.mattermost.rnbeta"   # optional, defaults to rnbeta
```

### 4. Build and install the app

Maestro **does not build the app**. Flows run against whatever app is already installed on the simulator or device. See [Building the app for Maestro](#building-the-app-for-maestro) below for options.

**Quick local option:** from the repo root, run `npm run ios` once to build and install on the booted simulator, then run Maestro.

### 5. Seed test data

```bash
node maestro/fixtures/seed.js
source .maestro-test-env.sh   # exports TEST_USER_EMAIL, TEST_USER_PASSWORD, etc.
```

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
npm run test              # from maestro/package.json
# or directly:
maestro test maestro/flows/

# Run a specific suite
maestro test maestro/flows/share_extension/
maestro test maestro/flows/calls/

# Dry-run (validate YAML without executing)
maestro test --dry-run maestro/flows/

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
3. **Set env vars** (e.g. `SITE_1_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_CHANNEL_NAME`). Optionally run `node maestro/fixtures/seed.js` and `source .maestro-test-env.sh`.
4. **Run Maestro** with `--platform android` so it targets the Android device instead of iOS:
   ```bash
   maestro test --platform android maestro/flows/
   maestro test --platform android maestro/flows/account/help_url.yml
   maestro test --platform android maestro/flows/channels/
   ```
   If only one device is connected, Maestro may pick it automatically; use `--platform android` when both an iOS simulator and an Android emulator are running.

---

## Sub-flow Conventions

Every flow file **must** follow these rules:

1. **Use `utils/login.yml`** as the first sub-flow to authenticate.
2. **Use `utils/navigate_to_channel.yml`** before any channel interaction.
3. **Use `utils/setup.yml`** in flows that need fresh test data (seeded channel/user).
4. **Include Zephyr tags**: every flow must declare `tags: [MM-TXXXX]` at the top.
5. **50-line lint rule**: no flow file may exceed 50 lines without a comment explaining what the block does.
6. **Take a screenshot** at the end of each flow for artifact upload.

### Sub-flow Usage Example

```yaml
appId: com.mattermost.rnbeta
---
- runFlow: ../../utils/login.yml
- runFlow: ../../utils/navigate_to_channel.yml
- tapOn:
    id: "channel.post_draft.input"
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
| `ADMIN_EMAIL` | — | Admin account email for seeding |
| `ADMIN_PASSWORD` | — | Admin account password for seeding |
| `TEST_USER_EMAIL` | — | Test user email for login |
| `TEST_USER_PASSWORD` | — | Test user password for login |
| `TEST_CHANNEL_NAME` | — | Channel name to navigate to |
| `MAESTRO_APP_ID` | `com.mattermost.rnbeta` | iOS bundle ID or Android package |
| `SYNC_TOKEN` | random 8-char string | Unique token for multi-device sync |
| `DEVICE_A_UDID` | — | UDID of first device (multi-device only) |
| `DEVICE_B_UDID` | — | UDID of second device (multi-device only) |
| `ADMIN_TOKEN` | — | Mattermost personal access token for API polling |
| `TEST_CHANNEL_ID` | — | Channel ID used in poll_for_message.js |

---

## CI Integration

Maestro tests run via `.github/workflows/e2e-maestro-template.yml`, a reusable `workflow_call` template invoked by nightly or on-demand jobs — not in the standard PR gate.

- All flows (including share extension and calls) run on an **iOS simulator** (iPhone 17 Pro, iOS 26.3.1) on `macos-15` GitHub Actions runners. No real device is needed for CI.
- Multi-device sync tests (`MM-T3055`/`MM-T3056`) are the exception — they require two physical devices and are run separately via `maestro/scripts/run_two_device.sh`.
- Keyboard/autocorrect tests (`MM-T227`) use `--ignore-uncovered` because autocorrect is non-deterministic across iOS versions.
- JUnit XML reports are written to `build/maestro-report.xml` and uploaded as CI artifacts.

---

## File Structure

```
maestro/
  package.json                         # Maestro CLI version pin + scripts
  README.md                            # This file
  utils/
    login.yml                          # Reusable: app launch + login
    navigate_to_channel.yml            # Reusable: tap channel in sidebar
    setup.yml                          # Reusable: seed test data
  fixtures/
    seed.js                            # Node script: create team/channel/user via API
    poll_for_message.js                # Node script: poll API for SYNC_TOKEN message
  flows/
    account/
      help_url.yml                     # MM-T3260
    calls/
      call_ui_permission.yml           # MM-T1411
    channels/
      channel_bookmark_file.yml        # MM-T5603
      channel_bookmark_attach_file_with_title.yml  # MM-T5616
    keyboard/
      autocorrect.yml                  # MM-T227 (nightly)
    multi_device/
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
