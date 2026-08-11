# E2E plan: Android full / iOS partial

Companion plan for [PR #10032](https://github.com/mattermost/mattermost-mobile/pull/10032) (Detox + Maestro orchestration via [Test System IO](https://github.com/mattermost/mattermost-test-system-io)).

## Goal

Cut the iOS critical path on PR E2E while keeping coverage. **Android owns the full functional matrix**; **iOS only covers platform-unique surfaces** that Android cannot exercise.

## Investigation baseline — run [31458940326](https://github.com/mattermost/mattermost-mobile/actions/runs/31458940326) @ `20e82637c`

### Maestro iOS “3 failed”

[Report](https://test-io.test.mattermost.com/reports/mattermost-mobile/pr-10032/20e8263/maestro-ios?gh_run_id=31458940326): not assertion failures. Units ended `interrupted` at ~540s (`maestro-timeout-ms`):

| Flow | Tag | Attempt |
|---|---|---|
| `flows/calls/call_ui_permission.yml` | MM-T1411 | interrupted ~541s |
| `flows/calls/leave_call.yml` | MM-T4833 | interrupted ~541s |
| `flows/calls/mute_unmute.yml` | MM-T4832 | interrupted ~541s |

Same three flows **passed on Maestro Android** (~2–4m each).

**Root cause:** `run_ci_batches.sh` path-skips `flows/calls/*` on iOS (CallKit/WebRTC on simulator), but Test System IO discovers by tag. Those tags had been removed from `exclude_tags.json` `ios` as “dead”. Restored in `2f2afe8f7`. Test rollup was `failed: 0` — interrupted units still count as `completed_fail`.

### Why wall clock ~1h 48m (04:35 → 06:23 UTC)

Critical path: **iOS build (~37m) → Detox iOS workers (~70m)**. Android finishes much earlier.

| Phase | Duration | Notes |
|---|---|---|
| `build-android-apk` (Detox) | ~20m | Detox build ~15m |
| `build-android-apk-maestro` | ~10.5m | APK ~9m |
| `build-ios-simulator` | ~37m | xcodebuild ~34.5m |
| Maestro Android worker | ~26m | setup ~4m + dispatch ~22m; orch begin→last ~26m |
| Detox Android workers | ~30–42m | dispatch ~36m on longest; orch ~43m; 20 shards |
| Detox iPad worker | ~26m | setup ~8m + dispatch ~17m; orch ~26m |
| Maestro iOS worker | ~65m | setup ~13m + dispatch ~52m (≈27m wasted on 3×9m Calls timeouts) |
| Detox iOS workers | ~47–70m | preboot ~9.5m + dispatch up to ~58m; orch ~70m; 20 shards |
| Summaries / rollup | <1m | after last worker |

Detox Android/iOS/iPad and Maestro Android were green on Test System IO for this SHA after prior flake skips.

## Target coverage split

### 1. Android = source of truth (full)

- **Detox Android:** keep full suite (current 20-worker Test System IO orchestration)
- **Maestro Android:** keep full suite including Calls (`MM-T1411` / `MM-T4832` / `MM-T4833`)

### 2. iOS Detox = complementary only

- Keep **iPad** job as-is (`detox/e2e/test/products/channels/ipad/*`)
- **Phone iOS:** run suites/cases Android cannot cover, for example:
  - Safari / status-bar hand-offs
  - iOS file provider / share sheet
  - Permission / Save Password / autofill paths
  - Any `it` that is `isAndroid() ? it.skip : it` (or equivalent)
- Drop duplicate phone-iOS coverage already exercised on Android (majority of shared Channels/Account/Messaging suites)
- **Preferred mechanism:** allowlist / include-tags (or dedicated search paths) for `detox-ios`, not another pile of `describe.skip`

### 3. iOS Maestro = complementary only

- Exclude Calls on iOS (done via tags in `detox/maestro/config/exclude_tags.json`; matches legacy `run_ci_batches.sh`)
- Prefer iOS-only flows:
  - Safari `help_url` (already Android-excluded)
  - iOS bookmark file picker (today skipped as `*_picker.yml` in batches — wire into Test System IO intentionally)
  - Other OS hand-offs
- Do **not** re-run account/timezone/channels flows that already pass on Android unless they assert iOS-specific UI

## Expected CI shape after split

- Wall clock dominated by Android Detox (~45–60m after build) + short iOS complement, instead of full Detox iOS (~70m post-build)
- Maestro iOS shrinks from ~9 flows / ~65m toward a small iOS-only set
- Required commit statuses stay: `e2e-test/detox-android`, `e2e-test/maestro-android`, plus slim `detox-ios` / `detox-ipad` / `maestro-ios`

## Out of scope

- No orchestrator retries (`retest-on-fail: false` stays)
- No rename of `e2e-detox-pr.yml` (Matterwick entry)

## Implementation checklist (follow-up)

- [ ] Inventory Detox cases that skip on Android or assert iOS-only UI; publish allowlist for `detox-ios`
- [ ] Shrink Maestro iOS flow path / exclude tags to iOS-only surfaces; keep Calls on Android only
- [ ] Optionally enable iOS picker flows under Test System IO (today skipped as `*_picker.yml`)
- [ ] Keep iPad job unchanged
- [ ] Re-run PR E2E and confirm wall clock + commit statuses
