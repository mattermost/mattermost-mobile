# Maestro E2E — Authoring Guidelines

Technical reference for engineers, QA, and AI tools writing Maestro flows in this repository.
For setup and CI wiring see [README.md](./README.md). For agent-specific rules see [AGENTS.md](./AGENTS.md).

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

Every file under `maestro/flows/**/*.yml` **must** start with this block **before** `tags:` / `appId:`:

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

## 3. Maestro platform rules (enforced)

These align with [Maestro docs](https://docs.maestro.dev/) and lessons from Mattermost mobile CI.

### Selectors

- **Always** `id:` (testID). **Never** `point:` except to dismiss system overlays with no accessibility node.
- If an element lacks a testID, add one in `app/` — do not work around with coordinates.
- Verify hierarchy before authoring: `maestro --device <id> hierarchy`

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

### Toggles

Parent toggle rows are not tappable. Use the Switch child testID:

```yaml
- tapOn:
    id: "report_problem.enable_log_attachments.toggled.false.button"
    optional: true
```

`optional: true` is allowed **only** on toggle taps (idempotent state) and genuinely intermittent system UI (permission prompts, Save Password).

### Modal exit on iOS

Use `launchApp: {stopApp: true, clearState: false}` — not `back` — to leave modal-presented screens.

### After mutating a toggle

1. Assert the new toggle visual state.
2. `waitForAnimationToEnd: {timeout: 3000}` (async server save).
3. Then any `stopApp: true` relaunch.

### `optional: true` — forbidden without evidence

Do **not** add `optional: true` to ordinary taps to silence failures. Fix the selector, wait, or branch with `runFlow.when`.

### Screenshots

- `takeScreenshot: <kebab-case-name>` at key transitions and at flow end.
- Names describe **state**, not implementation: `report-problem-dismissed`, not `after-breadcrumb-tap`.

### Sub-flows

1. `runFlow: ../../utils/login.yml` first when auth is required.
2. `runFlow: ../../utils/navigate_to_channel.yml` before channel actions.
3. Seed via shell (`npx tsx maestro/fixtures/seed.ts`) — not inside the YAML.

### Server config beyond defaults

1. Tag the flow uniquely (e.g. `MM-T67856_4`).
2. Add `--exclude-tags=<tag>` to the main CI `maestro test` invocation.
3. Add a dedicated patch → run → restore step in `e2e-maestro-template.yml` with `trap` restore.

---

## 4. CLI version pin

Single source of truth: [`maestro/maestro-version.json`](./maestro-version.json)

```json
{
  "version": "2.3.0",
  "commit": "f3dd692588e86691dfe79889d1a6117ab7a94d50",
  "releaseTag": "cli-2.3.0"
}
```

- Local install: `export MAESTRO_VERSION=2.3.0; curl -fsSL "https://get.maestro.mobile.dev" | bash`
- CI reads `maestro-version.json` and caches by commit SHA.
- Bump only after running the full suite on both platforms; update version **and** commit together.

---

## 5. CI layout

| Workflow | Role |
|---|---|
| `e2e-detox-pr.yml` | Matterwick entry point: builds, server provisioning, dispatches Detox + Maestro |
| `e2e-detox.yml` | Detox test runs (reusable) |
| `e2e-maestro-pr.yml` | Maestro status contexts, orchestration, final status (reusable) |
| `e2e-maestro-template.yml` | Reusable Maestro runner (simulator/emulator, seed, test, report) |

`e2e-detox-pr.yml` calls `e2e-maestro-pr.yml` and passes `artifact_run_id: ${{ github.run_id }}` so Maestro reuses the iOS `.app` and Android APK artifacts from the build jobs. The template passes that id to `actions/download-artifact` as `run-id` because reusable workflows have a distinct `github.run_id`.

`e2e-maestro-pr.yml` is only invocable via `workflow_call` from `e2e-detox-pr.yml` — it does not build apps or provision servers on its own.

---

## 6. AI / tool evaluation checklist

Before opening a PR, verify every changed flow against this list:

- [ ] Header has ticket, PRE-CONDITIONS, REQUIRED ENV VARS, ASSERTIONS, testIDs
- [ ] No Detox references, file paths into `app/`, or React implementation details in comments
- [ ] All interactions use `id:` selectors verified via `grep -rn 'testID=' app/`
- [ ] `tags:` includes the Zephyr id
- [ ] Login sub-flow present when auth is required
- [ ] Toggle taps use `.toggled.{true,false}.button` pattern
- [ ] iOS modal exits use `launchApp:{stopApp:true,clearState:false}`
- [ ] No `optional: true` on non-toggle, non-system-dialog taps
- [ ] Flow ends with `takeScreenshot`
- [ ] Non-default server config uses exclude-tag + dedicated CI step
- [ ] `npm run validate-headers` passes locally

### Automated header validation (local + CI)

```bash
cd maestro
npm run validate-headers
```

CI runs the same script in `e2e-detox-pr.yml` (`validate-maestro-flow-headers` job)
before `run-maestro` is invoked.

---

## 7. Example — canonical header

See [`flows/account/attach_logs.yml`](./flows/account/attach_logs.yml) for the reference implementation of this contract.
