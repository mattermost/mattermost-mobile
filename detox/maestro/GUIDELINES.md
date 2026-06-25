# Maestro E2E — Authoring Guidelines

Single source of truth for engineers, QA, and AI tools writing Maestro flows in this repository.
For setup and CI wiring see [README.md](./README.md).

---

## 1. Scope: when Maestro vs Detox

| Use Maestro | Use Detox |
|---|---|
| Cross-app flows (share extension, Safari/Chrome hand-off) | In-app navigation and form interaction |
| OS permission dialogs (mic, camera, photos) | API-driven setup and DB assertions |
| Multi-device orchestration | Fast, JS-bridge-heavy regression |
| External browser / mail composer verification | Component-level unit tests (Jest) |

Do **not** justify a Maestro flow by referencing Detox limitations in flow comments — state the **user-visible behavior** under test.

---

## 2. Flow file header contract

Every file under `detox/maestro/flows/**/*.yml` **must** start with this block **before** `tags:` / `appId:`:

```yaml
# MM-TXXXX: <one-line behavior summary>
#
# PRE-CONDITIONS:
#   - <server config, seed script, or device state required>
#
# REQUIRED ENV VARS:
#   - SITE_1_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_CHANNEL_NAME
#   - (list only vars this flow reads)
#
# ASSERTIONS:
#   - <observable outcome 1>
#   - <observable outcome 2>
#
# testIDs:
#   - settings.report_problem.option
#   - report_problem.screen
tags:
  - MM-TXXXX
appId: ${MAESTRO_APP_ID}
---
```

### Header rules

| Field | Required | Content |
|---|---|---|
| Ticket line | Yes | `# MM-TXXXX: <behavior>` — what the user sees, not how the app implements it |
| PRE-CONDITIONS | Yes | Server settings, seed steps, permissions, fixtures |
| REQUIRED ENV VARS | Yes | Only variables referenced in the flow |
| ASSERTIONS | Yes | Pass/fail outcomes in product language |
| testIDs | Yes | Every `id:` selector used in the flow (grep `app/` for source of truth) |
| `tags:` | Yes | At least the Zephyr ticket id |
| `appId` | Yes | `${MAESTRO_APP_ID}` |

### Comment style — DO / DON'T

```yaml
# GOOD — behavior and expected outcome
# MM-T67856: Tapping Report a Problem leaves Settings and opens the report form.
# PRE-CONDITIONS:
#   - Logged-in user on an unlicensed (free-edition) server
# ASSERTIONS:
#   - Settings is visible again after dismissing the report form

# BAD — implementation / Detox references (do not write these)
# On free edition, report_problem.tsx sets skipReportAProblemScreen = ...
# The original Detox spec at detox/e2e/... is describe.skip(...)
# WatermelonDB observables for AllowDownloadLogs may lag on first login
```

Inline step comments should explain **why a wait or branch exists** in test terms, not cite React components or Detox patterns:

```yaml
# GOOD
# iOS may show an in-app report screen or an external browser sheet — handle both.

# BAD
# SFSafariViewController hosts the form when isFreeEdition is true in report_problem.tsx
```

---

## 3. Maestro platform rules

These align with [Maestro docs](https://docs.maestro.dev/) and lessons from Mattermost mobile CI.

### Selectors

- **Always** `id:` (testID). **Never** `point:` except to dismiss system overlays with no accessibility node.
- **Exception**: Apple system apps (Photos, Safari share sheet) have no testIDs — share-extension coordinate-tap utils live on `rf-split/maestro-ios-deferred-flows` (not in default CI on `rf-split/maestro`).
- If an element lacks a testID, add one in `app/` — do not work around with coordinates.
- Verify hierarchy before authoring: `maestro --device <id> hierarchy`

testIDs follow `component.subcomponent.element`:

```yaml
- tapOn:
    id: "channel.post_draft.send_action.send.button"
- tapOn:
    id: "tab_bar.home.tab"
- tapOn:
    id: "login_form.username.input"
- tapOn:
    id: "channel_header.channel_quick_actions.button"
- tapOn:
    id: "share_extension.channel.option"
```

### Waits

- Prefer `extendedWaitUntil` on a specific element over `waitForAnimationToEnd`.
- Use `waitForAnimationToEnd` only when no stable element exists yet (e.g. immediately after login tap).

### Platform branches

```yaml
- runFlow:
    when:
      platform: iOS
    commands:
      - ...
```

Keep shared steps outside `runFlow` blocks.

### Environment variables

Never hardcode server URLs, credentials, or channel names:

| Variable | Description |
|----------|-------------|
| `${MAESTRO_APP_ID}` | App bundle ID (e.g. `com.mattermost.rnbeta`) |
| `${SITE_1_URL}` | Primary test server URL |
| `${TEST_USER_EMAIL}` | Test user email |
| `${TEST_USER_PASSWORD}` | Test user password |
| `${TEST_CHANNEL_NAME}` | Test channel name (set by seed script) |
| `${TEST_TEAM_NAME}` | Test team name (set by seed script) |

### App launch

Use `runFlow: ../../utils/login.yml` — do not add raw `launchApp` when login already handles stale sessions, call screens, and permission dialogs. Follow with `navigate_to_channel.yml` when needed.

### Toggles

Parent toggle rows are not tappable. Use the Switch child testID:

```yaml
- tapOn:
    id: "report_problem.enable_log_attachments.toggled.false.button"
    optional: true
```

Format: `<parent_id>.toggled.{true|false}.button` where the boolean is the **current** state.

Server preferences survive `clearState: true` — the next flow cannot assume default toggle state. Use `optional: true` on toggle taps or drive to a definitive end state.

After mutating a toggle:

1. Assert the new toggle visual state.
2. `waitForAnimationToEnd: {timeout: 3000}` (async server save).
3. Then any `stopApp: true` relaunch.

### Modal exit on iOS

Use `launchApp: {stopApp: true, clearState: false}` — not `back` — to leave modal-presented screens.

### `optional: true`

Allowed **only** on toggle taps (idempotent state) and genuinely intermittent system UI (permission prompts, Save Password, onboarding). Do **not** use on ordinary taps to silence failures.

```yaml
- tapOn:
    text: "Allow"
    optional: true
- tapOn:
    text: "Not Now"
    optional: true
```

### Bottom sheets (iOS)

`@gorhom/bottom-sheet` content is invisible to XCUITest unless `accessibilityViewIsModal={true}` on the content container (already set in `app/screens/bottom_sheet/index.tsx`). Callers must pass explicit `testID` on inner `OptionItem` components.

### Screenshots

- `takeScreenshot: <kebab-case-name>` at key transitions and at flow end.
- Names describe **state**, not implementation: `report-problem-dismissed`, not `after-breadcrumb-tap`.

### Sub-flows

1. `runFlow: ../../utils/login.yml` first when auth is required.
2. `runFlow: ../../utils/navigate_to_channel.yml` before channel actions.
3. Seed via shell (`npx tsx detox/maestro/fixtures/seed.ts`) — not inside the YAML.

### Server config beyond defaults

1. Tag the flow uniquely (e.g. `MM-T67856_4`).
2. Add `--exclude-tags=<tag>` to the main CI `maestro test` invocation.
3. Add a dedicated patch → run → restore step in `e2e-maestro-template.yml` with `trap` restore.

`AllowDownloadLogs` is under `SupportSettings`, not `ServiceSettings`:

```bash
curl -sS -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"SupportSettings":{"AllowDownloadLogs":false}}' \
  "$SITE_1_URL/api/v4/config/patch"
```

### Cross-platform notes

- **iOS share extension** (deferred branch `rf-split/maestro-ios-deferred-flows`): Maestro must be attached to the host app (Safari/Photos) before the share sheet opens; share target label is **Mattermost**, not **Mattermost Beta**.
- **Android Chrome**: Fresh emulators show first-run / ads interstitials — use `utils/dismiss_chrome_interstitial.yml` or CI Chrome pre-warm (see `create_android_emulator.sh`).
- **Android port forwarding**: `adb reverse tcp:8065 tcp:8065` when using localhost URLs.
- **iOS timezone**: `xcrun simctl spawn $SIMULATOR_ID launchctl setenv TZ "America/New_York"` (Xcode 26 removed `simctl timezone`).
- **Android timezone**: `adb shell setprop persist.sys.timezone "America/New_York"`.

---

## 4. Server provisioning & fixtures

Maestro flows run against Matterwick cloud servers (`SITE_1_URL`, `SITE_2_URL`, `SITE_3_URL`). CI provisions via `detox/provision_server.js` + `detox/maestro/fixtures/seed.ts`.

| Setting | Set by | Why |
|---|---|---|
| Trial Enterprise license | `detox/provision_server.js` | Calls + Custom Profile Attributes |
| Calls plugin + `DefaultEnabled` | `detox/provision_server.js` | Calls flows |
| Per-channel calls enable | `detox/maestro/fixtures/seed.ts` | Cloud servers may not auto-enable per channel |
| `EnableChannelBookmarks` | `detox/provision_server.js` | Bookmark flows |
| `ExperimentalViewArchivedChannels` | `detox/provision_server.js` | Archive flows |
| `RateLimitSettings.Enable=false` | `detox/provision_server.js` | Prevents 429s on burst traffic |
| `AllowDownloadLogs=false` (MM-T67856_4 only) | Dedicated CI step | Isolated attach-logs variant |

**iOS file bookmark fixture**: document picker reads from FileProvider.LocalStorage — CI copies `test_bookmark.png` there in `e2e-maestro-template.yml`.

**Android file bookmark fixture**: `adb push` to `/sdcard/Download/test_bookmark.png` + `MEDIA_SCANNER_SCAN_FILE` broadcast in `create_android_emulator.sh`.

**Calls flows**: after login, WebSocket-driven config can take 10–30s — use `waitForAnimationToEnd: {timeout: 25000}` at the top of calls flows (see `call_ui_permission.yml`).

Local parity: [README.md § Official local workflow](./README.md#official-local-workflow) and `./scripts/setup_local.sh`.

---

## 5. CLI version pin

Single source of truth: [`maestro-version.json`](./maestro-version.json)

- Local install: read version from `maestro-version.json`, then `curl -fsSL "https://get.maestro.mobile.dev" | bash`
- CI reads `maestro-version.json` and caches by commit SHA.
- Bump only after running the full suite on both platforms; update version **and** commit together.

---

## 6. CI layout

| Workflow | Role |
|---|---|
| `e2e-detox-pr.yml` | Matterwick entry point: builds, provisioning, header validation, dispatches Maestro |
| `e2e-maestro-pr.yml` | Maestro status contexts, orchestration (reusable) |
| `e2e-maestro-template.yml` | Simulator/emulator, seed, batch test runner, report |

Maestro runs via `detox/maestro/scripts/run_ci_batches.sh` (one flow per batch). JUnit reports are merged before HTML generation.

Device targets (same as Detox):

- iOS: iPhone 17 Pro, iOS 26.2 — `detox/scripts/preboot_ios_simulator.sh`
- Android: `detox_pixel_8_api_35` — `detox/create_android_emulator.sh` with `MAESTRO_ANDROID=true`

See [README.md § CI Integration](./README.md#ci-integration) for the full diagram.

---

## 7. Pre-PR checklist

Before opening a PR, verify every changed flow:

- [ ] Header has ticket, PRE-CONDITIONS, REQUIRED ENV VARS, ASSERTIONS, testIDs
- [ ] No Detox references, `app/` paths, or React implementation details in comments
- [ ] All interactions use `id:` selectors verified via `grep -rn 'testID=' app/`
- [ ] `tags:` includes the Zephyr id
- [ ] Login sub-flow present when auth is required
- [ ] Toggle taps use `.toggled.{true|false}.button` pattern
- [ ] iOS modal exits use `launchApp:{stopApp:true,clearState:false}`
- [ ] No `optional: true` on non-toggle, non-system-dialog taps
- [ ] Flow ends with `takeScreenshot`
- [ ] Non-default server config uses exclude-tag + dedicated CI step
- [ ] `npm run validate-headers` passes locally

```bash
cd detox/maestro && npm run validate-headers
```

CI runs the same script in `e2e-detox-pr.yml` (`validate-maestro-flow-headers`) before Maestro tests.

**Forbidden** without artifact evidence:

- Adding `optional: true` to a non-toggle tap to silence a failure.
- Increasing a timeout because "it's flaky" — find the real reason.
- Platform-only `runFlow.when` branches instead of fixing the actual issue.

---

## 8. Debugging a failing flow

1. Check `~/.maestro/tests/<latest>/` for screenshots and `view-hierarchy.xml`.
2. Classify: **testID drift** (grep `app/`), **navigation timeout** (inspect hierarchy), or **server state** (`curl ${SITE_1_URL}/api/v4/config`).
3. Re-run with the same env as CI:

```bash
source detox/maestro/.maestro-test-env.sh
~/.maestro/bin/maestro test detox/maestro/flows/<flow>.yml
```

For CI parity, use `detox/maestro/scripts/run_ci_batches.sh` (batch mode) with the CI-built `.app`/APK — not isolated single-flow runs only.

Use the Maestro CLI for final verification (matches CI). Use `maestro hierarchy` / MCP inspect tools during authoring iteration.

---

## 9. Example — canonical header

See [`flows/account/attach_logs.yml`](./flows/account/attach_logs.yml) for the reference implementation.
