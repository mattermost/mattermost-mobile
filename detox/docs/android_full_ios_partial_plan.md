# E2E plan: Android full / iOS partial

Companion plan for [PR #10032](https://github.com/mattermost/mattermost-mobile/pull/10032) (Detox + Maestro orchestration via [Test System IO](https://github.com/mattermost/mattermost-test-system-io)).

## Goal

Cut the iOS critical path on **PR** E2E while keeping coverage. **Android owns the full functional matrix**; **iOS only covers platform-unique surfaces** that Android cannot exercise. `MAIN` / `MASTER` / `RELEASE` keep full Detox iOS phone suite.

## How PR specs are identified / tagged

### Maestro — platform tags on each flow

Every flow under `detox/maestro/flows/**/*.yml` declares:

1. Its Zephyr id (`MM-T…`)
2. **Exactly one** platform tag:

| Tag | Meaning | PR dispatch |
|---|---|---|
| `shared` | Same product path on both OS; Android is source of truth | **Android only** |
| `android-only` | Android-specific (Calls / surfaces that hang on iOS simulator) | **Android only** |
| `ios-only` | iOS-specific (Safari hand-off, iOS file picker, …) | **iOS only** |

Example:

```yaml
tags:
  - MM-T3260
  - ios-only
```

**Discovery filter** (Test System IO `maestro-exclude-tags`, from `detox/maestro/config/exclude_tags.json`):

- `ios` = existing flake/seed excludes + `android-only` + `shared`
- `android` = existing flake/seed excludes + `ios-only`

Enforced by `detox/maestro/scripts/validate-flow-headers.sh` and documented in `detox/maestro/GUIDELINES.md`.

**Current PR Maestro shape:**

| Platform | Dispatched flows (approx) |
|---|---|
| Android | All non-excluded (`shared` + `android-only`; Calls included) |
| iOS | `ios-only` only (today: `flows/account/help_url.yml`) |

### Detox — file allowlist (not Jest tags)

Test System IO Detox discovery is **path-based** (one unit per `*.e2e.ts`). Jest `@tags` / `testNamePattern` are **not** used — they would not shrink the lease set.

| Leg | PR identification |
|---|---|
| Detox Android | Full tree `detox/e2e/test` (excludes `ipad/`) |
| Detox iPad | Unchanged: `detox/e2e/test/products/channels/ipad` |
| Detox iOS phone | Allowlist in `detox/e2e/config/ios_complementary_specs.json` |

Allowlist entries are paths relative to `detox/`. At begin + worker startup, `detox/utils/materialize_ios_complementary_specs.js` symlinks them into `detox/e2e/test/.ios_complementary/` for discovery.

**Initial allowlist rule:** files that contain at least one `(isAndroid() ? it.skip : it)` case (Android never runs that test). Suite-level `describe.skip` files are omitted. Expand the JSON when adding true iOS-only Detox coverage.

| Run type | Detox iOS phone `search_path` | Workers |
|---|---|---|
| `PR` (default) | `e2e/test/.ios_complementary` | 2 |
| `MAIN` / `MASTER` / `RELEASE` | `e2e/test` (full) | 20 |

Wired in `.github/workflows/e2e-detox.yml` + `e2e-ios-template.yml`.

## Investigation baseline — run [31458940326](https://github.com/mattermost/mattermost-mobile/actions/runs/31458940326) @ `20e82637c`

### Maestro iOS “3 failed”

[Report](https://test-io.test.mattermost.com/reports/mattermost-mobile/pr-10032/20e8263/maestro-ios?gh_run_id=31458940326): not assertion failures. Units ended `interrupted` at ~540s (`maestro-timeout-ms`):

| Flow | Tag | Attempt |
|---|---|---|
| `flows/calls/call_ui_permission.yml` | MM-T1411 | interrupted ~541s |
| `flows/calls/leave_call.yml` | MM-T4833 | interrupted ~541s |
| `flows/calls/mute_unmute.yml` | MM-T4832 | interrupted ~541s |

Same three flows **passed on Maestro Android** (~2–4m each). Root cause: Calls are unsuitable on iOS simulator; they are now `android-only` (and still Zephyr-excluded on iOS).

### Why wall clock ~1h 48m (04:35 → 06:23 UTC)

Critical path was **iOS build (~37m) → full Detox iOS (~70m)**. After this split, PR phone iOS Detox should lease ~8 files / 2 workers; Maestro iOS ~1 `ios-only` flow.

| Phase | Duration (that run) |
|---|---|
| `build-android-apk` (Detox) | ~20m |
| `build-android-apk-maestro` | ~10.5m |
| `build-ios-simulator` | ~37m |
| Maestro Android worker | ~26m |
| Detox Android workers | ~30–42m (20 shards) |
| Detox iPad worker | ~26m |
| Maestro iOS worker | ~65m (incl. ~27m wasted on Calls timeouts) |
| Detox iOS workers | ~47–70m (20 shards, full suite) |

## Out of scope

- No orchestrator retries (`retest-on-fail: false` stays)
- No rename of `e2e-detox-pr.yml` (Matterwick entry)
- Optional later: `maestro-include-tags` in Test System IO (symmetric to exclude) so iOS can select `ios-only` without excluding `shared` by name

## Checklist

- [x] Document Maestro platform tags + Detox allowlist identification
- [x] Tag Maestro flows (`ios-only` / `android-only` / `shared`)
- [x] Wire `exclude_tags.json` platform filters
- [x] Add Detox iOS complementary allowlist + materialize script
- [x] PR workflows: complementary search path + 2 workers; full suite on MAIN/MASTER/RELEASE
- [ ] Re-run PR E2E (`E2E/Run`) and confirm wall clock + commit statuses
- [ ] Grow allowlist / `ios-only` flows as new OS-unique coverage lands
