# `.cursor/` — Cursor Cloud Agent environment

This directory configures the [Cursor Cloud Agent](https://cursor.com/docs/cloud-agent/setup) environment for `mattermost-mobile`. It is **only** used when a cloud agent runs against this repo; the local Cursor IDE ignores it.

## What's here

| File | Purpose |
|---|---|
| `environment.json` | Cursor's `environment.schema.json` config. Declares the Dockerfile build, install/start hooks, ports, and long-lived `terminals` (Android emulator + Metro). |
| `Dockerfile` | Ubuntu 24.04 base + JDK 17 + Node 24 + Android SDK (API 34) + emulator + system image + `agent-browser` for computer use. Multi-arch (amd64 / arm64). |
| `scripts/cloud-agent-install.sh` | Idempotent install hook. Runs `npm ci`, ensures the AVD exists, stubs the private Intune submodule. |
| `scripts/cloud-agent-start.sh` | Materializes `AGENTS.md` from `cursor.md`, relaxes AppArmor user-namespace restrictions, starts `adb` server. Dockerd is opt-in via `CLOUD_AGENT_START_DOCKER=1`. |
| `scripts/cloud-agent-emulator.sh` | Launches the Android emulator headless with software rendering (no `/dev/kvm` in cloud). Runs in a tmux pane. |
| `cursor.md` | Cloud-only agent instructions (server creds, emulator caveats, skip flags). Materialized to `.cursor/AGENTS.md` at start. |

## Design choices

- **Android-only.** iOS builds need macOS, which cloud agents can't provide. The Dockerfile skips CocoaPods entirely; `postinstall.sh` is already a no-op on Linux.
- **No local Mattermost stack.** The agent points at an external long-lived Mattermost instance via `MATTERMOST_SERVER_URL` / `MATTERMOST_USERNAME` / `MATTERMOST_PASSWORD` secrets. This saves ~2GB of RAM and several minutes of boot vs. running the full docker-compose stack.
- **Emulator runs in `terminals`, not `start`.** Both the user and the agent can watch its tmux pane for boot progress, and restarting it is one keystroke.
- **Software-rendered emulator.** Cursor cloud VMs don't expose `/dev/kvm`. We use `-gpu swiftshader_indirect -accel off`. First boot is slow (a few minutes); the AVD config (`hw.ramSize=4096`, `disk.dataPartition.size=8G`) is tuned for headless work.
- **Docker is installed but off by default.** Mattermost mobile work doesn't need a docker daemon, and the image already has Docker CLI / DinD configuration ready if a future task needs it (`CLOUD_AGENT_START_DOCKER=1`).
- **Computer use kept.** `agent-browser` is installed globally and its Chromium runtime libs are pre-loaded, so Cursor's computer use feature works out of the box (subject to enterprise feature gating).

## Required Cursor dashboard configuration

Set these as secrets at https://cursor.com/agents:

- `MATTERMOST_SERVER_URL` — server URL
- `MATTERMOST_USERNAME` — test account username
- `MATTERMOST_PASSWORD` — test account password (mark **redacted**)

Optional skip flags for shortening boot:
- `CLOUD_AGENT_SKIP_NPM_INSTALL=1`
- `CLOUD_AGENT_SKIP_AVD=1`
- `CLOUD_AGENT_SKIP_AGENT_BROWSER_INSTALL=1`
- `CLOUD_AGENT_START_DOCKER=1` (opt in if a task needs docker)
- `CLOUD_AGENT_AVD_NAME=<name>` and `CLOUD_AGENT_ANDROID_PLATFORM=<api>` to override defaults.

## Updating

- Bumping Node / JDK / Android SDK versions: edit the `ARG` lines at the top of `Dockerfile`. Cursor rebuilds the image automatically when the file changes.
- Changing what gets hydrated on every boot: edit `scripts/cloud-agent-install.sh`. Keep it idempotent — it runs on partially cached state every time.
- Adding cloud-only agent guidance: edit `cursor.md`. Don't commit `.cursor/AGENTS.md` (it's gitignored and regenerated at boot).
