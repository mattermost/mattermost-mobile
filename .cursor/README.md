# Cursor Cloud Agent (PR babysitter)

Linux environment for Cloud Agents that watch pull requests: ESLint, TypeScript, Jest, i18n, and `gh pr checks`. It does **not** include Xcode, Android SDK, Docker-in-Docker, or device simulators.

Native iOS/Android work belongs on a Mac development node, not this VM.

## Layout

| File | Role |
|------|------|
| `environment.json` | Cloud Agent config (image, install, start) |
| `Dockerfile` | Ubuntu 24.04 + Node 24.15.0 + GitHub CLI |
| `scripts/cloud-agent-install.sh` | Idempotent JS dep hydration (same as PR CI) |
| `scripts/cloud-agent-start.sh` | Copies `cursor.md` → `AGENTS.md` |
| `scripts/cloud-agent-smoke.sh` | Optional lint/tsc/i18n/detox smoke (not run at boot) |
| `cursor.md` | Cloud-only agent instructions |

`.cursor/AGENTS.md` is generated at boot and gitignored.

## Install behavior

Boot uses `npm ci --ignore-scripts`, then the follow-up steps from `.github/actions/prepare-node-deps` (Sentry CLI, `patch-package`, generated assets). A normal `npm install` is skipped on purpose: Solidarity requires Android tooling this image does not have.

## Expected secrets

None. GitHub access for `gh` is provided by Cursor.

## Skip flags

See `cursor.md`. Useful flags: `CLOUD_AGENT_SKIP_NPM_DEPS`, `CLOUD_AGENT_SKIP_DETOX_DEPS`, `CLOUD_AGENT_SKIP_HUSKY`.

## Validation

After boot, `bash .cursor/scripts/cloud-agent-smoke.sh` exercises the Ubuntu PR jobs this VM can run. Add `--with-jest` to also run `npm run test:ci`. Recurring environment snapshots clone the default branch, so they only pick up these scripts after this config is merged.
