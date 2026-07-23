# Detox E2E — AI Agent Operating Manual

This file is the authoritative guide for AI agents working in the `detox/` directory.
Follow these rules exactly. Do not improvise on conventions that are explicitly defined here.

> **Working on Maestro flows?** See `maestro/GUIDELINES.md` for the authoring spec and flow gotchas.
> (toggle-tap pattern, modal back-nav on iOS 26.3, server preference persistence,
> `AllowDownloadLogs` path under `SupportSettings`, etc.) and per-flow server-setting
> requirements. Server provisioning lives in `detox/provision/` (run via `npm run provision` in the detox package) and is
> shared between Detox and Maestro.

---

## AGENT SAFETY RULES

**Before modifying any file:**
1. Read the file first — never edit based on assumptions
2. Verify testIDs exist in the app source before referencing them in page objects
3. Never hardcode strings in `by.id()` — always use page object testID constants
4. Never share mutable state between `it()` blocks
5. Never modify files outside `detox/` without explicit user instruction

**Safe operations (proceed without asking):**
- Adding new test files under `e2e/test/products/`
- Adding new page objects under `e2e/support/ui/`
- Adding new server API helpers under `e2e/support/server_api/`
- Reading any file to understand patterns

**Operations that require user confirmation:**
- Modifying `.detoxrc.json` (affects all test runs)
- Modifying `e2e/config.js` (affects Jest configuration)
- Adding new npm dependencies to `detox/package.json`
- Modifying `create_android_emulator.sh`

**Verification steps before calling a task complete:**
- [ ] TypeScript compiles: `cd detox && npm run tsc`
- [ ] Lint passes: `cd detox && npm run lint`
- [ ] New page objects are exported from `index.ts` in their directory
- [ ] New server API helpers are exported from `e2e/support/server_api/index.ts`

---

## INVESTIGATION PHASE (start here for any task)

Before writing any code, answer these questions by reading the relevant files:

1. **Does a page object already exist for the screen?** → check `e2e/support/ui/screen/`
2. **Does a component object already exist?** → check `e2e/support/ui/component/`
3. **Does a server API helper already exist?** → check `e2e/support/server_api/`
4. **Does the testID exist in the app?** → search `app/` with `grep -r "testID=" --include="*.tsx"`
5. **Is there an existing test in the same area to follow as a pattern?** → check the relevant folder under `e2e/test/products/channels/`

---

## PACKAGE & COMMANDS

`detox/` is a **separate npm package** with its own `node_modules`. Always `cd detox` before running commands.

```bash
# Install dependencies
cd detox && npm install

# Type check
cd detox && npm run tsc

# Lint
cd detox && npm run lint

# Fix lint issues
cd detox && npm run check     # runs both lint and tsc

# Build Android APK for tests
cd detox && npm run e2e:android-build

# Run Android tests
cd detox && npm run e2e:android-test

# Run iOS tests (requires pre-built app in ../mobile-artifacts/Mattermost.app)
cd detox && npm run e2e:ios-test

# Run a single test file
npx detox test -c ios.sim.debug e2e/test/products/channels/search/search_messages.e2e.ts
npx detox test -c android.emu.debug e2e/test/products/channels/search/search_messages.e2e.ts

# Generate report (CI use)
cd detox && npm run e2e:save-report
```

---

## CI PIPELINE INTEGRATION

### Trigger Tiers

| Tier | Trigger | Platform | Shards | Search Path | Approx Time |
|------|---------|----------|--------|-------------|-------------|
| **PR full** | Matterwick + `E2E/Run` label | Detox iOS/Android/iPad + Maestro | 20 Detox (iOS/Android), 1 iPad, 1 Maestro each | `detox/e2e/test` (full) | ~30–45+ min wall-clock |
| **Main** | Matterwick main push (`run_type=MASTER` today; `MAIN` also accepted → TSIO `mobile-main`) | Same as PR | Same as PR | `detox/e2e/test` | Same as PR |
| **CMT / Release** | Matterwick on `build-release-*` → CMT | Detox + Maestro across server versions | Full suite on latest server; smoke subset on older | latest: `detox/e2e/test`; older: `…/smoke_test` | Varies by matrix |

Status context: `e2e/mobile` (PR/Main) or `e2e/compatibility-matrix-testing` (CMT). TSIO groups: `mobile-pr` / `mobile-main` / `mobile-release`.

### Smoke Tests Location

`detox/e2e/test/products/channels/smoke_test/` — quick regression suite used as the **CMT older-server subset**, not as an automatic every-PR-push tier.
PR E2E runs the full `detox/e2e/test` tree when labeled.

### Workflow Files

| File | Purpose |
|------|---------|
| `.github/workflows/e2e-detox-pr.yml` | Matterwick entry: builds, Detox + Maestro dispatch, TSIO status |
| `.github/workflows/e2e-detox.yml` / `e2e-maestro-pr.yml` | Platform orchestration (reusable) |
| `.github/workflows/e2e-ios-template.yml` | Detox iOS shard runner |
| `.github/workflows/e2e-android-template.yml` | Detox Android shard runner |
| `.github/workflows/e2e-maestro-template.yml` | Maestro iOS/Android runner |
| `.github/workflows/compatibility-matrix-testing.yml` | CMT / release multi-server matrix |

### Detox Configuration (`.detoxrc.json`)

| Setting | Value | Notes |
|---------|-------|-------|
| iOS device | iPhone 17 Pro / iOS 26.3 | Simulator |
| Android device | `detox_pixel_8_api_35` AVD | Emulator |
| `reinstallApp` | `false` | App not reinstalled between tests |
| `launchApp` | `false` | Tests manually launch app |
| `shutdownDevice` | `false` | Emulator/simulator stays up after suite |
| `debugSynchronization` | 20000ms | Detox sync debug timeout |
| Screenshots | Only on failure | Kept at `detox/artifacts/` |
| Video | Disabled | |

---

## FOLDER STRUCTURE

```text
detox/
├── .detoxrc.json                  # Detox device/app/config definitions
├── package.json                   # Separate npm package (own node_modules)
├── create_android_emulator.sh     # Creates and boots Android AVD for CI
├── e2e/
│   ├── config.js                  # Jest config entry point for Detox
│   ├── path_builder.js            # Artifact paths (screenshots/logs/videos)
│   ├── support/
│   │   ├── test_config.ts         # URLs + admin credentials from env vars
│   │   ├── utils/
│   │   │   ├── index.ts           # timeouts, wait(), getRandomId(), isIos(), isAndroid()
│   │   │   ├── detoxhelpers.ts    # waitForElementToBeVisible(), retryWithReload()
│   │   │   └── email.ts           # Email verification helpers
│   │   ├── server_api/            # REST API client for test data setup/teardown
│   │   │   ├── client.ts          # Axios client with CSRF cookie handling
│   │   │   ├── setup.ts           # apiInit() — creates team + channel + user
│   │   │   ├── channel.ts         # apiCreateChannel, apiAddUserToChannel, apiDeleteChannel
│   │   │   ├── post.ts            # apiCreatePost, apiGetLastPostInChannel
│   │   │   ├── user.ts            # apiCreateUser, apiLogin, generateRandomUser
│   │   │   ├── team.ts            # apiCreateTeam, apiAddUserToTeam
│   │   │   ├── system.ts          # apiGetConfig, apiUpdateConfig
│   │   │   ├── preference.ts      # apiSaveUserPreference
│   │   │   ├── bot.ts             # apiCreateBot
│   │   │   ├── plugin.ts          # apiInstallPlugin
│   │   │   └── index.ts           # Re-exports all: {Channel, Post, Setup, Team, User, ...}
│   │   └── ui/
│   │       ├── component/         # Reusable UI component page objects
│   │       │   ├── autocomplete.ts
│   │       │   ├── navigation_header.ts
│   │       │   ├── post_draft.ts
│   │       │   ├── post_list.ts
│   │       │   ├── post.ts
│   │       │   ├── search_bar.ts
│   │       │   └── index.ts       # Re-exports all components
│   │       └── screen/            # Screen page objects
│   │           ├── channel_list.ts
│   │           ├── channel.ts
│   │           ├── search_messages.ts
│   │           ├── login.ts
│   │           ├── server.ts
│   │           ├── home.ts
│   │           └── index.ts       # Re-exports all screens
│   └── test/
│       └── products/
│           ├── channels/          # ~100 test files
│           │   ├── autocomplete/  # 8 files
│           │   ├── search/        # 5 files
│           │   ├── messaging/     # 24 files
│           │   ├── channels/      # 16 files
│           │   ├── account/       # 15 files
│           │   ├── threads/       # 6 files
│           │   └── smoke_test/    # quick suite (CMT older-server subset)
│           ├── agents/            # AI agent product tests
│           └── playbooks/         # Playbooks product tests
```

---

## PAGE OBJECT MODEL

### Screen Page Object — Required Structure

```typescript
class SomeScreen {
    // 1. testID constants — single source of truth
    testID = {
        someScreen: 'some_screen.screen',
        someButton: 'some_screen.some_button',
    };

    // 2. Element definitions
    someScreen = element(by.id(this.testID.someScreen));
    someButton = element(by.id(this.testID.someButton));

    // 3. Dynamic getters for list items
    getItem = (itemId: string) => element(by.id(`some_screen.item.${itemId}`));

    // 4. toBeVisible() — required, waits for screen to appear
    toBeVisible = async () => {
        await waitFor(this.someScreen).toExist().withTimeout(timeouts.TEN_SEC);
        return this.someScreen;
    };

    // 5. open() — navigates to this screen
    open = async () => {
        await HomeScreen.someTab.tap();
        return this.toBeVisible();
    };
}

const someScreen = new SomeScreen();
export default someScreen;
```

### testID Convention

Hierarchical dot notation: `scope.feature.element`

| Example testID | Meaning |
|---------------|---------|
| `search_messages.screen` | Screen container |
| `search.modifier.in` | "in:" modifier button |
| `autocomplete.channel_mention.section_list` | Channel mention dropdown |
| `autocomplete.channel_mention_item.{channelName}` | Individual channel item |
| `autocomplete.at_mention_item.{userId}` | Individual user mention item |
| `channel_list.category.channels.channel_item.{channelName}` | Channel in sidebar |

**Finding testIDs:** Search the app source with `grep -r 'testID=' app/ --include="*.tsx" | grep "your_keyword"`

### Key Screen Page Objects

| Export | File | Purpose |
|--------|------|---------|
| `SearchMessagesScreen` | `screen/search_messages.ts` | Search screen, modifiers, results |
| `ChannelScreen` | `screen/channel.ts` | Channel view + post input |
| `ChannelListScreen` | `screen/channel_list.ts` | Sidebar channel list + navigation |
| `HomeScreen` | `screen/home.ts` | Tab bar, logout |
| `LoginScreen` | `screen/login.ts` | Login form |
| `ServerScreen` | `screen/server.ts` | Server connection screen |

### Key Component Page Objects

| Export | File | Purpose |
|--------|------|---------|
| `Autocomplete` | `component/autocomplete.ts` | All autocomplete dropdown types |
| `NavigationHeader` | `component/navigation_header.ts` | `searchInput`, `searchClearButton` |
| `PostDraft` | `component/post_draft.ts` | Post input, send button |
| `PostList` | `component/post_list.ts` | Generic post list (reused across screens) |

### Autocomplete Component Usage

```typescript
await Autocomplete.toBeVisible();        // assert visible
await Autocomplete.toBeVisible(false);   // assert NOT visible

// Channel mentions (triggered by "~" or "in:")
await expect(Autocomplete.sectionChannelMentionList).toExist();
const {channelMentionItem} = Autocomplete.getChannelMentionItem(channelName);

// At-mentions (triggered by "@" or "from:")
await expect(Autocomplete.sectionAtMentionList).toExist();
const {atMentionItem} = Autocomplete.getAtMentionItem(userId);
```

### SearchMessagesScreen Modifiers

```typescript
SearchMessagesScreen.searchModifierIn       // inserts "in:" → channel mention autocomplete
SearchMessagesScreen.searchModifierFrom     // inserts "from:" → @mention autocomplete
SearchMessagesScreen.searchModifierBefore   // inserts "before:" (date suggestion NOT YET IMPLEMENTED)
SearchMessagesScreen.searchModifierAfter    // inserts "after:" (date suggestion NOT YET IMPLEMENTED)
SearchMessagesScreen.searchModifierOn       // inserts "on:" (date suggestion NOT YET IMPLEMENTED)
SearchMessagesScreen.searchModifierExclude  // inserts "-" prefix
SearchMessagesScreen.searchModifierPhrases  // inserts quotes
SearchMessagesScreen.searchInput            // the text input field
SearchMessagesScreen.searchClearButton      // clears input
```

---

## TEST FILE STRUCTURE

### Standard Template

```typescript
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Feature Area - Feature Name', () => {
    const serverOneDisplayName = 'Server 1';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-TXXXX_1 - should do something', async () => {
        // # Navigate to search
        await SearchMessagesScreen.open();

        // * Verify search input is visible
        await expect(SearchMessagesScreen.searchInput).toBeVisible();

        // # Return to channel list for next test
        await ChannelListScreen.open();
    });
});
```

### Comment Conventions

- `// #` — test step / action
- `// *` — assertion / expected result

### Test ID Naming

`MM-TXXXX_N` where `XXXX` is the Jira/Zephyr ticket number and `N` is the sub-test index.

---

## SERVER API

### One-liner Init (use for most tests)

```typescript
const {channel, team, user} = await Setup.apiInit(siteOneUrl);
// Creates: one team, one public channel, one user (added to both)
```

### Custom Init

```typescript
import {Channel, Team, User, Post} from '@support/server_api';

const {team} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'my-test'});
const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
    teamId: team.id,
    type: 'O',   // 'O' = public, 'P' = private
    prefix: 'autocomplete',
});
const {user} = await User.apiCreateUser(siteOneUrl);
await Team.apiAddUserToTeam(siteOneUrl, user.id, team.id);
await Channel.apiAddUserToChannel(siteOneUrl, user.id, channel.id);
await Post.apiCreatePost(siteOneUrl, {channelId: channel.id, message: 'Hello'});
```

### URL Constants

From `@support/test_config`:
- `siteOneUrl` → `http://localhost:8065` — used for all API calls
- `serverOneUrl` → device-aware URL — used for `ServerScreen.connectToServer()` (Android uses `10.0.2.2`)

---

## HELPERS & UTILITIES

```typescript
import {timeouts, wait, getRandomId, isIos, isAndroid} from '@support/utils';
import {waitForElementToBeVisible} from '@support/utils/detoxhelpers';

timeouts.HALF_SEC   // 500ms
timeouts.ONE_SEC    // 1000ms
timeouts.TWO_SEC    // 2000ms
timeouts.TEN_SEC    // 10000ms
timeouts.ONE_MIN    // 60000ms

await wait(timeouts.ONE_SEC);     // simple delay
const id = getRandomId();          // 6-char alphanumeric unique ID
if (isIos()) { ... }
if (isAndroid()) { ... }

// Wait without requiring Detox bridge idle (good for animations)
await waitForElementToBeVisible(element(by.id('...')), timeouts.TEN_SEC);
```

---

## TEST COVERAGE MAP

### Smoke (`e2e/test/products/channels/smoke_test/`) — CMT older-server subset

Quick regression of core flows. Used when CMT runs against non-latest server versions; PR E2E uses the full suite.

### Search (`e2e/test/products/channels/search/`)

| File | Key Coverage |
|------|-------------|
| `search_messages.e2e.ts` | Elements, from:, in:, exclude, phrases, modifiers, recent, cross-team, empty state, edit/reply/delete, save, pin |
| `cross_team_search.e2e.ts` | Team switching in search results |
| `pinned_messages.e2e.ts` | View/manage pinned posts |
| `recent_mentions.e2e.ts` | @mention results in search |
| `saved_messages.e2e.ts` | Saved/bookmarked posts |

### Autocomplete (`e2e/test/products/channels/autocomplete/`)

| File | Key Coverage |
|------|-------------|
| `at_mention.e2e.ts` | @ suggestions in post draft |
| `channel_mention.e2e.ts` | ~ suggestions in post draft |
| `emoji_suggestion.e2e.ts` | : emoji suggestions |
| `slash_suggestion.e2e.ts` | / command suggestions |
| `channel_post_draft.e2e.ts` | Combined autocomplete in channel draft |
| `edit_post.e2e.ts` | Autocomplete in edit mode |
| `thread_post_draft.e2e.ts` | Autocomplete in thread reply draft |

### Other Areas

- **messaging/** (24 files) — sending, editing, reactions, attachments, markdown
- **channels/** (16 files) — create, archive, join, leave, DMs, group messages
- **account/** (15 files) — profile, notifications, preferences, timezone
- **threads/** (6 files) — thread replies, following, unread

---

## ADDING NEW TESTS — CHECKLIST

1. **Investigate first**: check existing page objects, helpers, and tests in the same area
2. **Place file**: `e2e/test/products/channels/<area>/<name>.e2e.ts`
3. **Use `Setup.apiInit(siteOneUrl)`** for isolated test data (never reuse shared data across tests)
4. **`beforeEach`**: assert `ChannelListScreen.toBeVisible()` as starting point
5. **Each `it()`**: navigate back to channel list at the end (clean state for next test)
6. **Comment style**: `// #` for steps, `// *` for assertions
7. **testIDs**: use page object constants — never hardcode `by.id('raw_string')`
8. **New testID needed?**: add to the app component first, then add to page object
9. **Test isolation**: never share mutable state between `it()` blocks
10. **Export**: if adding a new page object, export it from the relevant `index.ts`
11. **Verify**: run `npm run tsc` and `npm run lint` before committing

---

## KNOWN ISSUES

### Date Suggestion Autocomplete (MM-T3393 Step 3)

`DateSuggestion` component is commented out in `app/components/autocomplete/autocomplete.tsx` (lines 219–220). The `before:`, `after:`, and `on:` modifiers do **not** show a date picker. Do not write tests asserting date autocomplete behavior until this is implemented.

### Channel Mention in Search (MM-T3393 Step 2)

Tapping `searchModifierIn` inserts `in:` and **does** trigger channel mention autocomplete (`Autocomplete.sectionChannelMentionList`) without further typing. MM-T5294_3 covers a similar case but also types a channel name — these are distinct scenarios.

---

## DEBUGGING E2E FAILURES

### MANDATORY: read the artifact before proposing a fix

This rule overrides any default tendency to "patch first and see." If a detox test is failing, you MUST complete steps 1–4 below BEFORE editing any test, page object, or app code. State each finding in the chat before the fix proposal. No exceptions.

1. **Open `detox/artifacts/<latest run>/<test name>/testFnFailure.png`** with the Read tool. State in one sentence what screen the app is on at failure time and which UI element the assertion was looking for.
2. **Open `device.log` in the same directory.** Find the failing action's timestamp from the run output, then `awk` ±3 seconds around it. Look for:
   - `UIKit:EventDispatch ... Sending UIEvent` → confirms the synthetic touch was dispatched
   - `(UIKitCore) send gesture actions` → confirms a gesture handler received it
   - `RCTAnimatedNodeDTXSpy ... needs update` after the touch → confirms a TouchableOpacity press animation fired
   - `CFNetwork ... Task <id> resuming` then `received response, status N` → confirms (or refutes) that the handler made its HTTP call
   - `DTXJSTimerSyncResource ... timed out after Nms` where N >> the declared duration → JS thread was blocked; correlate against what the handler does after `await`
3. **Open `detox.log`** and grep for `testFailed`. For each failed expectation, parse its `viewHierarchy` JSON and list the testIDs that ARE and AREN'T present at failure time. Use a `python3` heredoc if needed — `id="..."` attributes are testIDs.
4. **State the diagnosis explicitly using this template**, then fix accordingly:
   > Tap dispatched: YES/NO (evidence: `<log line>`)
   > Handler ran: YES/NO (evidence: `<log line>`)
   > Side effect occurred (HTTP/DB/nav): YES/NO (evidence: `<log line>`)
   > UI re-rendered: YES/NO (evidence: viewHierarchy testIDs)
   > Therefore root cause is: <pick one>
   > - test (selector/timing/missing wait)
   > - detox/native (tap missed, sync stuck, simulator)
   > - app (handler didn't fire / state didn't update / observer didn't emit)

Only after stating those four findings may you propose a fix. If finding 4 says "app bug," the fix is NOT a retry loop or longer timeout in the test — say so and either fix the app or stop and report.

### Forbidden patches without evidence

Never apply any of these without first completing the artifact-reading checklist above:

- **Retry loops around a single tap/action.** Detox `tap` reporting success (`invokeResult: {}`) means the synthetic touch WAS dispatched. Retrying it doesn't help if the app's handler ran but produced no state change. If your first attempt at fixing a flake adds a retry loop, you are guessing.
- **Increasing a timeout beyond what already works in another test.** If `verifyStatusCleared` previously asserted instantaneously and now needs 10s of polling, the right question is "what changed about the state-update path?", not "how long should I wait?".
- **Wrapping an action in try/catch to swallow the failure.** Hides the symptom; never fixes the cause.
- **Adding a second tap because the first "might not have fired."** It fired — check `UIKit:EventDispatch` in `device.log`.

You get ONE attempt at increasing a timeout per failure mode. If a second iteration is also "wait longer / try again," stop and run the artifact checklist instead.

### Distinguishing tap-not-received from app-didn't-react

Symptom: Detox `tap` returns success, then a `toBeVisible` / `toHaveText` / `not.toBeVisible` assertion times out.

This is almost always the app, not Detox. Verify by checking:

| Question | Where to look | What it means |
|---|---|---|
| Was the touch dispatched to a UIWindow? | `device.log` for `Sending UIEvent type: 0` at the action's timestamp | If yes, the tap reached iOS hit-testing |
| Did a TouchableOpacity animate (press feedback)? | `device.log` for `RCTAnimatedNodeDTXSpy ... needs update` right after the UIEvent | If yes, an onPress handler was invoked |
| Did the expected side effect fire? | `device.log` for `CFNetwork ... resuming` (HTTP) or batchRecords log (DB) | If yes, the handler ran to completion |
| Did the React tree update? | `detox.log` `testFailed.viewHierarchy` — search for the testIDs that should have disappeared/appeared | If old testIDs persist, the observer/render didn't propagate — app bug |

When the app didn't react, the fix belongs in the app (often: an unawaited fire-and-forget Promise in the handler, a stale observable closure, or a model mutation that doesn't trigger emission). Do not patch this in the test.

### Pause-before-edit signals

If the user says any of "stop guessing", "look at the logs", "you're in a loop", "read the screenshot" — treat that as a hard stop. Do not propose a code change in the same turn. Reply with findings from the artifact checklist above, nothing else.

### Screenshots and Logs

Artifacts saved to `detox/artifacts/` after each run:
- Screenshots: only on test failure (`keepOnlyFailedTestsArtifacts: true`)
- Logs: always enabled

### Common Failure Patterns

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `element not found` timeout | testID mismatch or screen not loaded | Check actual testID in app source; add `toBeVisible()` wait before interaction |
| Test passes locally, fails on CI | Race condition or emulator timing | Add `wait(timeouts.ONE_SEC)` before flaky assertion; verify emulator fully booted |
| All tests fail with login error | Server not reachable | Check `SITE_1_URL` env var; verify server is up |
| `element is not visible` on tap | Element exists but off-screen | Scroll to element first: `await scrollView.scroll(100, 'down')` |
| Android emulator hangs | AVD not fully booted | `create_android_emulator.sh` waits for `boot_completed`; check its output in CI logs |

### Detox Sync Issues

`debugSynchronization: 20000` means Detox logs sync status after 20s of waiting. If you see these logs:
- App has pending network requests → add `waitFor` instead of `wait`
- Animations running → use `withTimeout` with a longer period or disable animations in test

### CI-Specific Debugging

- Test artifacts uploaded as `android-results-{hash}-{runId}` / `ios-results-{hash}-{runId}`
- Full HTML report linked in PR comments after each E2E run
- Check GitHub Actions run summary for per-shard pass/fail breakdown
