# Detox E2E — AI Agent Operating Manual

This file is the authoritative guide for AI agents working in the `detox/` directory.
Follow these rules exactly. Do not improvise on conventions that are explicitly defined here.

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
| **Smoke** | Every PR push (default) | iOS + Android | 1 each | `detox/e2e/test/products/channels/smoke_test` | 30–45 min |
| **Full iOS** | Label: `E2E iOS tests for PR` | iOS | 10 | `detox/e2e/test` | 60–180 min |
| **Full Android** | Label: `E2E Android tests for PR` | Android | 10 | `detox/e2e/test` | 90–180 min |
| **Scheduled** | Wednesday + Thursday midnight | iOS + Android | 10 each | `detox/e2e/test` | 90–180 min |

### Smoke Tests Location

`detox/e2e/test/products/channels/smoke_test/` — 7 files, quick regression coverage.
These run automatically on every PR push without any label.

### Workflow Files

| File | Purpose |
|------|---------|
| `.github/workflows/e2e-detox-pr.yml` | PR trigger, build + dispatch to templates |
| `.github/workflows/e2e-ios-template.yml` | iOS shard runner (reusable workflow) |
| `.github/workflows/e2e-android-template.yml` | Android shard runner (reusable workflow) |
| `.github/workflows/e2e-detox-scheduled.yml` | Nightly scheduled runs |

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
│           │   └── smoke_test/    # 7 files (smoke tier, run on every PR)
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
await Channel.apiCreatePost(siteOneUrl, {channelId: channel.id, message: 'Hello'});
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

### Smoke (`e2e/test/products/channels/smoke_test/`) — runs on every PR

7 files covering quick regression of core flows.

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
