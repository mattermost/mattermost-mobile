# Cursor Cloud Agent Instructions — mattermost-mobile

This file is materialized to `.cursor/AGENTS.md` at boot. It only applies to Cursor Cloud Agent runs; local IDE runs ignore it.

## What this environment is

- Ubuntu 24.04, JDK 17, Node 24 (matches `.nvmrc`), Android SDK with API 34 platform + system image, the Android emulator, and `agent-browser` for computer use.
- **No iOS**: iOS builds require macOS and are not supported in cloud agents. Anything iOS-specific (CocoaPods, Xcode, simulator) should be flagged as out-of-scope, not attempted.
- **No local Mattermost stack**: this agent points at an external Mattermost server. Don't try to `docker compose up` the server; use the env vars below.

## Connecting to the Mattermost server

The agent uses an external long-lived Mattermost instance. The following secrets must be configured in the Cursor dashboard (https://cursor.com/agents):

| Secret | Purpose |
|---|---|
| `MATTERMOST_SERVER_URL` | Full URL of the Mattermost server (e.g. `https://example.cloud.mattermost.com`) |
| `MATTERMOST_USERNAME` | Login username for the test account |
| `MATTERMOST_PASSWORD` | Login password for the test account (mark redacted) |

When driving the app via Mobile MCP, log in with these credentials. Don't hardcode them in code or commits.

## Running the app on the emulator

Two long-lived processes run in tmux panes (see the `terminals` config):

1. **`emulator`** — boots the `cloud_agent_avd` AVD headless with software rendering. Expect the first cold boot to take a few minutes (no KVM acceleration is available). Confirm it's online with:
   ```bash
   adb devices
   ```
   The emulator should show as `emulator-5554` with state `device`.

2. **`metro`** — runs the React Native Metro bundler on `:8081`. Hot reload works for JS/TS. Native code changes (Java/Kotlin/C++) require a rebuild via `npm run android`.

To install and launch the app after a fresh start:
```bash
npm run android
```

This builds the debug APK, installs it via `adb`, and launches the main activity. The first build is slow (~10 minutes); subsequent incremental builds are much faster.

## Interacting with the app via Mobile MCP

Mobile MCP talks to the emulator over ADB. Typical workflow:
1. Confirm `adb devices` lists `emulator-5554`.
2. Use Mobile MCP to launch the app, enter the server URL (`MATTERMOST_SERVER_URL`), log in with `MATTERMOST_USERNAME` / `MATTERMOST_PASSWORD`, and interact.
3. Take screenshots to verify UI state — don't just trust that "the app launched".

If the emulator hangs or becomes unresponsive, restart the `emulator` tmux pane (`Ctrl+C`, then re-run the pane command). The AVD survives restarts; only the running emulator process needs to be cycled.

## Environment skip flags

These can be set as Cursor secrets to shorten boot for specific tasks:

| Variable | Effect |
|---|---|
| `CLOUD_AGENT_SKIP_NPM_INSTALL=1` | Skip `npm ci` during install (use when node_modules is already hot) |
| `CLOUD_AGENT_SKIP_AVD=1` | Skip AVD provisioning (useful if reusing a snapshot) |
| `CLOUD_AGENT_SKIP_AGENT_BROWSER_INSTALL=1` | Skip browser download for computer use |
| `CLOUD_AGENT_AVD_NAME=<name>` | Override the AVD name (default `cloud_agent_avd`) |
| `CLOUD_AGENT_ANDROID_PLATFORM=<api>` | Override the platform API level (default `34`) |
| `CLOUD_AGENT_START_DOCKER=1` | Start `dockerd` at boot (off by default — this agent doesn't need it) |

## Verification before declaring a task done

Per repo-level guidance (see root `CLAUDE.md`), before calling something complete:
1. Run the relevant checks (`npm run tsc`, `npm run fix`, `npm test`) — delegate noisy ones to a subagent.
2. Actually exercise the feature on the emulator via Mobile MCP — don't stop at "the app launched". Trigger the feature, verify state changes, take screenshots.
3. Don't commit planning files (`PLAN.md`, etc.).

## When things go wrong

- **`adb devices` shows offline / no device**: the emulator pane likely crashed. Tail `~/.android/avd/cloud_agent_avd.avd/*.log` and restart the pane.
- **Build fails with Gradle daemon OOM**: `gradle.properties` already sets `-Xmx4096m`. If the cloud VM has less RAM, reduce in a local override under `~/.gradle/gradle.properties`.
- **Metro fails with port 8081 in use**: kill the existing process (`fuser -k 8081/tcp`) and restart the `metro` pane.
- **`npm install` fails on `@mattermost/intune` submodule**: the Intune library is private and not required for cloud-agent work. The install script auto-stubs the directory with `.gitkeep` so postinstall passes.

## Out of scope in this environment

- iOS builds, the iOS simulator, CocoaPods, Xcode.
- The full Mattermost server stack (we use an external instance).
- Real physical devices (the cloud VM has no USB passthrough).
- KVM hardware acceleration for the emulator (cloud VMs don't expose `/dev/kvm`).
