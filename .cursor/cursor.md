# Cloud Agent — PR babysitter

This VM is Linux-only and exists to watch and unstick pull requests. It can lint, typecheck, run Jest, and drive GitHub checks. It cannot build or run the native iOS/Android apps.

Read [CLAUDE.md](../CLAUDE.md) for repository conventions. Do not try to run simulators, emulators, CocoaPods, Fastlane, Detox, or Maestro here.

## What this environment can run

These match the default PR workflow in `.github/workflows/ci.yml` (Ubuntu):

```bash
npm run lint
npm run tsc
npm run check                 # lint + tsc
./scripts/precommit/i18n.sh
npm run test:ci               # local analog of the PR `test` job (that job uses test:ci:coverage)
cd detox && npm run tsc
bash detox/maestro/scripts/validate-flow-headers.sh
cd detox && npm run test:unit # detox JS unit tests, not device E2E
```

`./scripts/precommit/i18n.sh` may rewrite non-`en.json` locale files as a side effect. Discard those diffs — Weblate owns every language file except `assets/base/i18n/en.json`.

Or: `bash .cursor/scripts/cloud-agent-smoke.sh` (add `--with-jest` to include `npm run test:ci`).

Before pushing a CI fix, run the narrowest command that failed, then `npm run check` if you touched JS/TS.

If Jest or `tsc` is killed with OOM, retry with a smaller heap and fewer workers:

```bash
NODE_OPTIONS=--max_old_space_size=4096 npx tsc --noEmit
NODE_OPTIONS=--max_old_space_size=4096 npx jest --verbose=false --forceExit --workerIdleMemoryLimit=1GB --maxWorkers=2
```

## What this environment cannot run

- `npm install` / `npm ci` without `--ignore-scripts` — Solidarity requires `ANDROID_HOME` and `emulator`
- `npm run pod-install`, `npm run ios`, `npm run android`
- `npm run build:ios`, `npm run build:android`
- Detox / Maestro device tests (`npm run e2e:*`)
- Xcode, CocoaPods, Android SDK, simulators, emulators
- `actionlint` / `shellcheck` (diagnose workflow YAML from GitHub Actions logs)
- Coverage comparison against `main` artifacts (`npm run test:ci:coverage` needs GHA cache)

Deps were installed during boot with `npm ci --ignore-scripts` plus the same follow-up steps as `.github/actions/prepare-node-deps`. Do not reinstall with a full `npm install`.

## Babysitter loop

1. Resolve the PR: `gh pr view --json number,url,headRefName`
2. Inspect checks: `gh pr checks --json name,bucket,state,workflow,link`
3. If checks are pending: `gh pr checks --watch --fail-fast`
4. On failure, read the job log (`gh run view <id> --log-failed` for GitHub Actions) before changing code
5. Fix only in-scope failures; verify locally with the commands above; `git push` without `--force`

`gh pr checks` without `--json` exits `8` while any check is pending — that is not an environment failure. Prefer `--json` and read `state`. Cursor's `gh` token is read-only (no merge/comment writes); push fixes with `git`.

For iOS compile or E2E failures, diagnose from CI logs and push a targeted source fix. Do not attempt to reproduce native builds on this VM. Let GitHub's `macos-*` / E2E runners be the proof.

## Skip flags

Set these as Cloud Agent secrets or env vars to shorten boot:

| Flag | Effect |
|------|--------|
| `CLOUD_AGENT_SKIP_NPM_DEPS=1` | Skip root `npm ci` and asset generation |
| `CLOUD_AGENT_SKIP_DETOX_DEPS=1` | Skip `detox/` `npm ci` |
| `CLOUD_AGENT_SKIP_HUSKY=1` | Skip wiring git hooks |

## Secrets

None required. Cursor provides GitHub auth for `gh` against this repository.
