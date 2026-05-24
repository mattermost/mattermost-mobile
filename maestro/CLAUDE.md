# Maestro Flow Authoring — Agent Operating Manual

This file is the authoritative guide for AI agents working in the `maestro/` directory.
For broader project context and Detox conventions see the repo-root `CLAUDE.md` and
`detox/CLAUDE.md`.

---

## Required server settings

Maestro flows run against ephemeral cloud test servers provisioned by Matterwick
(`SITE_1_URL`, `SITE_2_URL`, `SITE_3_URL`). Each site must be provisioned with:

| Setting | Set by | Why |
|---|---|---|
| Trial Enterprise license | `detox/provision_server.js:ensureTrialLicense` | Calls + Custom Profile Attributes are Enterprise features |
| `PluginSettings.Plugins['com.mattermost.calls'].DefaultEnabled` | `detox/provision_server.js:278` | Lets `calls_seed.ts` skip per-channel enable when DefaultEnabled is honored |
| Calls plugin installed | `detox/provision_server.js:REQUIRED_PLUGINS` | All `maestro/flows/calls/*` depend on it |
| Per-channel calls enable (POST `/plugins/com.mattermost.calls/{channelId}`) | `maestro/fixtures/seed.ts:enableCallsInChannel` | Cloud servers don't always auto-enable from DefaultEnabled |
| `ServiceSettings.EnableChannelBookmarks` | `detox/provision_server.js:286` | `maestro/flows/channels/channel_bookmark_*.yml` |
| `TeamSettings.ExperimentalViewArchivedChannels` | `detox/provision_server.js:235` | Archive flows + detox parity |
| `RateLimitSettings.Enable=false` | `detox/provision_server.js:201` | Prevents 429s on burst test traffic |
| `SupportSettings.AllowDownloadLogs=false` (only for `MM-T67856_4`) | CI step around the flow | See attach-logs flow notes below |

Local parity command:

```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=<password-from-matterwick-comment>
export SITE_URL=https://mobile-pr-XXXX-site-N-XXXX.test.mattermost.cloud
./maestro/scripts/setup_local.sh
source maestro/.maestro-test-env.sh
~/.maestro/bin/maestro test maestro/flows/<flow>.yml
```

---

## Flow gotchas (verified end-to-end on iOS 26.3 sim, Maestro v2.3.0)

### 1. Toggle (Switch) elements are NOT directly tappable

In this app, every toggle row is rendered via `app/components/option_item/option_item.tsx`
which emits a parent testID **plus** child testIDs for the actual Switch. Tapping the
parent does nothing because `TOGGLE` is not in `TouchableOptionTypes`.

**Wrong:**
```yaml
- tapOn:
    id: "report_problem.enable_log_attachments"   # no-op
```

**Right:**
```yaml
- tapOn:
    id: "report_problem.enable_log_attachments.toggled.false.button"
    optional: true   # may be already in target state
- tapOn:
    id: "report_problem.enable_log_attachments.toggled.true.button"
    optional: true
```

The testID format is `<parent_id>.toggled.{true|false}.button` where the boolean is
the **current** state (the Switch you tap to leave that state). `optional: true` makes
the flow idempotent regardless of starting state — useful because server-stored
preferences persist across `clearState:true` reinstalls (see #4).

### 2. iOS 26.3: `- back` cannot dismiss modal-presented screens

Maestro's `back` does not fire the OS dismiss for modal stacks (e.g. screens pushed via
`navigateToModal`). The flow gets stuck on the modal.

**Workaround pattern:**
```yaml
- launchApp:
    stopApp: true
    clearState: false   # preserve login + DB so we resume in place
```

This kills the app process and relaunches without wiping data. The user stays logged
in and the app returns to its initial route (channel list).

Use this — not `back` — to exit any modal-style screen on iOS.

### 3. `handleToggleAttachLogs` and other `savePreference` calls are async

`savePreference` does an HTTP POST + WatermelonDB write. If the flow taps a toggle and
**immediately** terminates the app (e.g. via the `launchApp:{stopApp:true}` pattern
above), the write can be aborted mid-flight and the toggle state is lost on relaunch.

**Pattern:**
```yaml
- tapOn:
    id: "<toggle_id>.toggled.false.button"
- assertVisible:
    id: "<toggle_id>.toggled.true.button"   # visual confirmation
- waitForAnimationToEnd:
    timeout: 3000                            # grace for async save
- launchApp:
    stopApp: true
    clearState: false
```

The visual-state assertion proves the UI rendered the new state; the 3s grace lets the
fire-and-forget save call complete before the app is killed.

### 4. Server preferences survive `clearState: true` relaunches

`login.yml` calls `launchApp:{clearState:true}` which reinstalls the app fresh — local
DB wiped. But the server retains the user's saved preferences. On next login, the
mobile client refetches them, so the toggle is back to whatever the user last set it
to **on the server**, not the React Native default.

Consequence: a flow that ran toggle ON, exited, and the next flow can't assume the
toggle starts OFF. Use the `optional: true`/visual-state pattern from #1 to handle
either starting state, or have the flow tap the toggle twice (off → on → off /
on → off → on) for a definitive end-state.

### 5. `AllowDownloadLogs` lives under `SupportSettings`, not `ServiceSettings`

`AllowDownloadLogs` is at `SupportSettings.AllowDownloadLogs` in the Mattermost server
config. The Mattermost docs sometimes call it a "service" setting because it gates a
support-feature path in the mobile client, but the JSON field path is `SupportSettings`.

**Correct curl:**
```bash
curl -sS -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"SupportSettings":{"AllowDownloadLogs":false}}' \
  "$SITE_1_URL/api/v4/config/patch"
```

### 6. iOS Simulator file fixtures need FileProvider.LocalStorage path

The iOS document picker only sees files in the app's local File Provider Storage —
not `Documents/`, not `tmp/`, not `~/Downloads`. For `channel_bookmark_file.yml`:

```bash
UDID=$(xcrun simctl list devices booted -j | python3 -c "import sys,json; d=json.load(sys.stdin); print(next(iter(d['devices'].values()))[0]['udid'])")
LOCAL_STORAGE=$(find ~/Library/Developer/CoreSimulator/Devices/$UDID/data/Containers/Shared/AppGroup \
  -name ".com.apple.mobile_container_manager.metadata.plist" \
  -exec grep -l "FileProvider.LocalStorage" {} \; | xargs -I{} dirname {} | head -1)
mkdir -p "$LOCAL_STORAGE/File Provider Storage"
cp detox/e2e/support/fixtures/image.png "$LOCAL_STORAGE/File Provider Storage/test_bookmark.png"
```

Android equivalent is `adb push <fixture> /sdcard/Download/test_bookmark.png` + a
`MEDIA_SCANNER_SCAN_FILE` broadcast.

### 7. iOS WebSocket-driven config can take 10–30s to propagate after login

After `login.yml`, the React-Native client does a full sync (`entry()`) before
calling `loadConfigAndCalls()`. So `pluginEnabled` starts false even on a server
with the Calls plugin enabled. A `waitForAnimationToEnd:{timeout:25000}` near the
top of any Calls flow gives the WS event time to land. See
`maestro/flows/calls/call_ui_permission.yml` for the existing precedent.

### 8. Run-list scope and `--exclude-tags`

`.github/workflows/e2e-maestro-template.yml` enumerates directories (iOS and Android
have slightly different sets). A flow added under an already-included directory
is auto-run by both jobs. **Don't** add a flow that needs non-default server config
to a generally-included directory — instead:

1. Tag the flow uniquely (e.g. `tags: [MM-T67856_4]`).
2. Add `--exclude-tags=<tag>` to the main `maestro test` invocation.
3. Add a dedicated step that does patch → `maestro test <single-flow>` → restore,
   with `trap` for the restore so it always runs.

Existing precedent: the `Run MM-T67856_4 with AllowDownloadLogs=false` step in both
the iOS and Android sections of `e2e-maestro-template.yml`.

---

## Authoring checklist

When you add a new flow:

- [ ] Place under `maestro/flows/<area>/<name>.yml`.
- [ ] Header block with: ticket id (`# MM-TXXXX:`), brief, PRE-CONDITIONS, REQUIRED
      ENV VARS, source-of-truth testID references.
- [ ] `tags:` at least the ticket id.
- [ ] `appId: ${MAESTRO_APP_ID}`.
- [ ] `- runFlow: ../../utils/login.yml` first if the flow needs auth.
- [ ] For toggle taps: use `.toggled.{true,false}.button` + `optional: true` pattern.
- [ ] For modal-style screen exits on iOS: `launchApp:{stopApp:true,clearState:false}`,
      not `back`.
- [ ] After mutating a toggle: visual-state assertion + 3s grace before any
      `stopApp:true`.
- [ ] If the flow needs server config beyond what the provisioner sets: tag uniquely,
      add `--exclude-tags` to the main run-list, add a dedicated patch-run-restore
      step in `e2e-maestro-template.yml`.
- [ ] testIDs sourced via `grep -rn "testID=" app/` — never hardcoded by guessing.

---

## Debugging a failing maestro flow

1. Check `~/.maestro/tests/<latest>/<flow>/screenshot.png` for end-state.
2. Check `~/.maestro/tests/<latest>/<flow>/view-hierarchy.xml` for what testIDs
   were rendered at failure.
3. Classify the failure:
   - **testID drift** — the id you tapped isn't in the hierarchy. Grep app source
     to find the actual id. If the toggle pattern (#1) wasn't followed, fix it.
   - **Navigation didn't land** — `extendedWaitUntil` times out before the next
     screen renders. Re-inspect intermediate screens via `mcp__maestro__inspect_screen`.
   - **Server state** — assertion fails because the provisioned server config
     differs from what the flow assumes. Verify with `curl ${SITE_1_URL}/api/v4/config`.
4. Re-run via:
   ```bash
   source maestro/.maestro-test-env.sh
   ~/.maestro/bin/maestro test \
     --env SITE_1_URL="$SITE_1_URL" \
     --env TEST_USER_EMAIL="$TEST_USER_EMAIL" \
     --env TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
     --env TEST_CHANNEL_NAME="$TEST_CHANNEL_NAME" \
     --env TEST_TEAM_NAME="$TEST_TEAM_NAME" \
     --env ADMIN_TOKEN="$ADMIN_TOKEN" \
     --env MAESTRO_APP_ID="com.mattermost.rnbeta" \
     maestro/flows/<flow>.yml
   ```

**Forbidden** without artifact evidence (mirrors the detox rule in `detox/CLAUDE.md`):

- Adding `optional: true` to a non-toggle tap to silence a failure.
- Increasing a timeout because "it's flaky" — find the real reason.
- Wrapping in conditional `runFlow.when.platform` instead of fixing the actual issue.

---

## Maestro CLI vs maestro MCP

- **Local CLI (`~/.maestro/bin/maestro`)** requires Java on PATH. Used by CI and by
  the `setup_local.sh` path.
- **Maestro MCP tool (`mcp__maestro__*`)** bundles its own JVM. Use for ad-hoc
  `inspect_screen` and inline YAML probes during flow authoring. Pass a `device_id`
  from `mcp__maestro__list_devices`.

Use the MCP for iteration. Use the CLI for "does the actual `maestro test` command
work the way CI runs it."
