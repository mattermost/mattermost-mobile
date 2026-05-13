# Agent instructions

For repository-wide development guidance (architecture, testing, build commands, code style), see [`CLAUDE.md`](./CLAUDE.md). It applies to every agent runtime.

## Cursor Cloud Agents

When this repo is loaded into a [Cursor Cloud Agent](https://cursor.com/docs/cloud-agent/setup), the environment under [`.cursor/`](./.cursor/) provisions:

- Ubuntu 24.04 with JDK 17, Node 24, and the Android SDK + emulator (API 34).
- `agent-browser` for Cursor's computer use feature.
- A headless Android emulator in a tmux pane, so Mobile MCP can drive the app directly.

The cloud agent points at an **external** long-lived Mattermost server — there is no local server stack. Configure these secrets in the Cursor dashboard:

- `MATTERMOST_SERVER_URL`
- `MATTERMOST_USERNAME`
- `MATTERMOST_PASSWORD` (mark **redacted**)

See [`.cursor/README.md`](./.cursor/README.md) for the design rationale and [`.cursor/cursor.md`](./.cursor/cursor.md) for the cloud-agent-specific runtime instructions (it is materialized to `.cursor/AGENTS.md` at boot).

iOS is **not** supported in cloud agents (requires macOS). All cloud-agent work happens on Android.
