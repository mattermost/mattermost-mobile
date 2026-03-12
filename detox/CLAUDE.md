# Detox E2E Test Framework — Mattermost Mobile

## Overview

Detox E2E tests live in `detox/`. They run against a real Mattermost server using:
- **Detox 20.47.0** with Jest as the test runner
- **Page Object Model (POM)** pattern for all UI interactions
- **Server API helpers** for test data setup/teardown
- **TypeScript** throughout

Config entry point: `detox/.detoxrc.json` → runs `e2e/config.js`

---

## Folder Structure

```
detox/
├── .detoxrc.json                  # Detox device/app/config definitions
├── package.json                   # Separate npm package (own node_modules)
├── e2e/
│   ├── config.js                  # Jest config for Detox
│   ├── path_builder.js            # Artifact paths for screenshots/logs
│   ├── support/
│   │   ├── test_config.ts         # URLs, admin credentials (from env vars)
│   │   ├── utils/
│   │   │   ├── index.ts           # timeouts, wait(), getRandomId(), isIos(), isAndroid()
│   │   │   ├── detoxhelpers.ts    # waitForElementToBeVisible(), retryWithReload()
│   │   │   └── email.ts           # Email verification helpers
│   │   ├── server_api/            # REST API client for test data setup
│   │   │   ├── client.ts          # Axios client with CSRF cookie handling
│   │   │   ├── setup.ts           # apiInit() — creates team + channel + user
│   │   │   ├── channel.ts         # apiCreateChannel, apiAddUserToChannel, apiDeleteChannel...
│   │   │   ├── post.ts            # apiCreatePost, apiGetLastPostInChannel...
│   │   │   ├── user.ts            # apiCreateUser, apiLogin, generateRandomUser...
│   │   │   ├── team.ts            # apiCreateTeam, apiAddUserToTeam...
│   │   │   ├── system.ts          # apiGetConfig, apiUpdateConfig...
│   │   │   ├── preference.ts      # apiSaveUserPreference...
│   │   │   ├── bot.ts             # apiCreateBot...
│   │   │   ├── plugin.ts          # apiInstallPlugin...
│   │   │   └── index.ts           # Re-exports all: { Channel, Post, Setup, Team, User, ... }
│   │   └── ui/
│   │       ├── component/         # Reusable UI components (used across screens)
│   │       │   ├── autocomplete.ts          # Autocomplete list component
│   │       │   ├── navigation_header.ts     # Search input, back button, header title
│   │       │   ├── post_draft.ts            # Post input, send button
│   │       │   ├── post_list.ts             # Generic post list (reused by many screens)
│   │       │   ├── post.ts                  # Individual post elements
│   │       │   ├── search_bar.ts            # Search bar component
│   │       │   └── index.ts                 # Re-exports all components
│   │       └── screen/            # Screen page objects
│   │           ├── channel_list.ts          # Channel list / home
│   │           ├── channel.ts               # Channel screen + post input
│   │           ├── search_messages.ts       # Search screen (modifiers, results)
│   │           ├── login.ts                 # Login screen
│   │           ├── server.ts                # Server connection screen
│   │           ├── home.ts                  # Home screen tabs
│   │           └── index.ts                 # Re-exports all screens
│   └── test/
│       └── products/
│           ├── channels/          # Main test suite (~100 tests)
│           │   ├── autocomplete/  # 8 autocomplete test files
│           │   ├── search/        # 5 search test files
│           │   ├── messaging/     # 24 messaging tests
│           │   ├── channels/      # 16 channel management tests
│           │   ├── account/       # 15 account/settings tests
│           │   ├── smoke_test/    # 7 quick regression tests
│           │   └── threads/       # 6 thread tests
│           ├── agents/            # AI agent product tests
│           └── playbooks/         # Playbooks product tests
```

---

## Page Object Model Pattern

Every screen and reusable component has a class in `e2e/support/ui/`.

### Screen Page Object — Structure

```typescript
class SomeScreen {
    // 1. All testIDs in one object at the top
    testID = {
        someScreen: 'some_screen.screen',
        someButton: 'some_screen.some_button',
    };

    // 2. Element definitions using by.id()
    someScreen = element(by.id(this.testID.someScreen));
    someButton = element(by.id(this.testID.someButton));

    // 3. Dynamic element getters (for lists/items that vary by data)
    getItem = (itemId: string) => {
        return element(by.id(`some_screen.item.${itemId}`));
    };

    // 4. toBeVisible() — standard wait for screen to appear
    toBeVisible = async () => {
        await waitFor(this.someScreen).toExist().withTimeout(timeouts.TEN_SEC);
        return this.someScreen;
    };

    // 5. open() — navigate to this screen
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

Examples:
- `search_messages.screen` — screen container
- `search.modifier.in` — "in:" modifier button on search screen
- `search.modifier.before` — "before:" modifier button on search screen
- `autocomplete.channel_mention.section_list` — channel mention dropdown
- `autocomplete.channel_mention_item.{channelName}` — individual item
- `autocomplete.at_mention_item.{userId}` — user mention item
- `channel_list.category.channels.channel_item.{channelName}` — channel in list

### Key Screen Objects

| Import | File | Purpose |
|--------|------|---------|
| `SearchMessagesScreen` | `screen/search_messages.ts` | Search screen, modifiers (`in:`, `before:`, `from:`, etc.), results |
| `ChannelScreen` | `screen/channel.ts` | Channel view, post input |
| `ChannelListScreen` | `screen/channel_list.ts` | Channel list, navigation |
| `HomeScreen` | `screen/home.ts` | Tab navigation, logout |
| `LoginScreen` | `screen/login.ts` | Login form |
| `ServerScreen` | `screen/server.ts` | Server connection |

### Key Component Objects

| Import | File | Purpose |
|--------|------|---------|
| `Autocomplete` | `component/autocomplete.ts` | All autocomplete list types |
| `NavigationHeader` | `component/navigation_header.ts` | `searchInput`, `searchClearButton` |
| `PostList` | `component/post_list.ts` | Generic post list, reused across screens |

### Autocomplete Component

`Autocomplete` (from `@support/ui/component`) handles all suggestion lists:

```typescript
// Check visibility of the autocomplete container
await Autocomplete.toBeVisible();       // assert visible
await Autocomplete.toBeVisible(false);  // assert NOT visible

// Channel mention list
await expect(Autocomplete.sectionChannelMentionList).toExist();

// Get a specific channel mention item
const {channelMentionItem} = Autocomplete.getChannelMentionItem(channelName);
await expect(channelMentionItem).toExist();

// At-mention list
await expect(Autocomplete.sectionAtMentionList).toExist();
const {atMentionItem} = Autocomplete.getAtMentionItem(userId);

// testIDs used by Autocomplete
// 'autocomplete'                            — root container
// 'autocomplete.channel_mention.section_list'
// 'autocomplete.at_mention.section_list'
// 'autocomplete.channel_mention_item.{name}'
// 'autocomplete.at_mention_item.{userId}'
```

### SearchMessagesScreen — Modifiers

The search screen has modifier buttons that pre-fill the search input:

```typescript
SearchMessagesScreen.searchModifierIn      // tapping adds "in:" → triggers channel mention autocomplete
SearchMessagesScreen.searchModifierFrom    // tapping adds "from:" → triggers @mention autocomplete
SearchMessagesScreen.searchModifierBefore  // tapping adds "before:" → intended to trigger date suggestion
SearchMessagesScreen.searchModifierAfter   // tapping adds "after:" → intended to trigger date suggestion
SearchMessagesScreen.searchModifierOn      // tapping adds "on:" → intended to trigger date suggestion
SearchMessagesScreen.searchModifierExclude // tapping adds "-" prefix
SearchMessagesScreen.searchModifierPhrases // tapping adds quotes
SearchMessagesScreen.searchInput           // the text input field (from NavigationHeader)
SearchMessagesScreen.searchClearButton     // clear/reset button
```

---

## Test File Structure

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
        // Create isolated test data via API
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // Log in
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // Assert we're at a known starting point
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-TXXXX_1 - should do something', async () => {
        // # Step description
        await SearchMessagesScreen.open();

        // * Assertion description
        await expect(SearchMessagesScreen.searchInput).toBeVisible();

        // # Cleanup — return to starting point for next test
        await ChannelListScreen.open();
    });
});
```

### Comment Conventions

- `// #` — test step / action
- `// *` — assertion / expected result

### Test ID Naming

Tests use Jira/Zephyr IDs: `MM-TXXXX_N` where N is the sub-test index.

---

## Server API Setup

### One-liner Init

```typescript
const {channel, team, user} = await Setup.apiInit(siteOneUrl);
```

Creates: one team, one public channel, one user (added to both).

### Custom Init

```typescript
import {Channel, Team, User, Setup} from '@support/server_api';

// Create team
const {team} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'search-test'});

// Create channel in team
const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
    teamId: team.id,
    type: 'O',       // 'O' = public, 'P' = private
    prefix: 'autocomplete',
});

// Create user and add to team+channel
const {user} = await User.apiCreateUser(siteOneUrl);
await Team.apiAddUserToTeam(siteOneUrl, user.id, team.id);
await Channel.apiAddUserToChannel(siteOneUrl, user.id, channel.id);

// Create a post
await Channel.apiCreatePost(siteOneUrl, {channelId: channel.id, message: 'Hello'});
// OR:
const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, channel.id);
```

### URLs

From `@support/test_config`:
- `serverOneUrl` — used for `ServerScreen.connectToServer()` (device-aware: `10.0.2.2` on Android)
- `siteOneUrl` — used for all API calls (`http://localhost:8065`)

---

## Helpers & Utilities

```typescript
import {timeouts, wait, getRandomId, isIos, isAndroid} from '@support/utils';
import {waitForElementToBeVisible} from '@support/utils/detoxhelpers';

// Timeouts
timeouts.HALF_SEC   // 500ms
timeouts.ONE_SEC    // 1000ms
timeouts.TWO_SEC    // 2000ms
timeouts.TEN_SEC    // 10000ms
timeouts.ONE_MIN    // 60000ms

// Wait
await wait(timeouts.ONE_SEC);   // simple delay

// Unique IDs for test data
const id = getRandomId();       // 6-char alphanumeric

// Platform check
if (isIos()) { ... }
if (isAndroid()) { ... }

// Wait for element without requiring idle bridge (good for animations)
await waitForElementToBeVisible(element(by.id('...')), timeouts.TEN_SEC);
```

---

## Running Tests

```bash
cd detox

# iOS debug (requires pre-built app in ../mobile-artifacts/Mattermost.app)
npm run e2e:ios-test

# Android debug (uses APK from ../android/app/build/outputs/apk/debug/)
npm run e2e:android-build    # build APK
npm run e2e:android-test     # run tests on emulator

# Run a single file
npx detox test -c ios.sim.debug e2e/test/products/channels/search/search_messages.e2e.ts
```

---

## Existing Test Coverage (by area)

### Search (`e2e/test/products/channels/search/`)

| File | Describe | Test Cases |
|------|----------|-----------|
| `search_messages.e2e.ts` | Search - Search Messages | 12 — elements, from:, in:, exclude, phrases, modifiers, recent, cross-team, empty, edit/reply/delete, save, pin |
| `cross_team_search.e2e.ts` | Search - Cross Team Search | team switching in search |
| `pinned_messages.e2e.ts` | Search - Pinned Messages | view/manage pinned posts |
| `recent_mentions.e2e.ts` | Search - Recent Mentions | @mention results |
| `saved_messages.e2e.ts` | Search - Saved Messages | saved/bookmarked posts |

### Autocomplete (`e2e/test/products/channels/autocomplete/`)

| File | Describe | Key Coverage |
|------|----------|-------------|
| `at_mention.e2e.ts` | Autocomplete - At Mention | @ suggestions in post draft |
| `channel_mention.e2e.ts` | Autocomplete - Channel Mention | ~ suggestions in post draft |
| `emoji_suggestion.e2e.ts` | Autocomplete - Emoji Suggestion | : suggestions |
| `slash_suggestion.e2e.ts` | Autocomplete - Slash Suggestion | / command suggestions |
| `channel_post_draft.e2e.ts` | Autocomplete - Channel Post Draft | combined autocomplete |
| `edit_post.e2e.ts` | Autocomplete - Edit Post | autocomplete in edit mode |
| `thread_post_draft.e2e.ts` | Autocomplete - Thread Post Draft | autocomplete in threads |

---

## Known Issues / Implementation Notes

### Date Suggestion Autocomplete (MM-T3393 Step 3)

The `DateSuggestion` component is currently **commented out** in
`app/components/autocomplete/autocomplete.tsx` (lines 219–220).
The `enableDateSuggestion` prop exists in the type but is not wired up.

This means the `before:`, `after:`, and `on:` search modifiers do **not** currently
show a date picker autocomplete. Tests for this behaviour should be written to
verify the intended behaviour once the feature is implemented.

When implementing date suggestion tests, the expected testID pattern will be:
- Container: `autocomplete.date_suggestion.flat_list` (to be confirmed when implemented)
- The component would be added to `e2e/support/ui/component/autocomplete.ts`

### Channel Mention in Search (MM-T3393 Step 2)

Tapping `searchModifierIn` inserts `in:` into the search input, which **does**
trigger the channel mention autocomplete (`Autocomplete.sectionChannelMentionList`).
This is already partially covered by `search_messages.e2e.ts` MM-T5294_3 but
that test also types a channel name. MM-T3393 Step 2 specifically verifies the
autocomplete appears immediately after tapping `in:` without any further typing.

---

## Adding New Tests — Checklist

1. Place test file at `e2e/test/products/channels/<area>/<name>.e2e.ts`
2. Use `Setup.apiInit(siteOneUrl)` for isolated test data
3. Start every `it()` from `ChannelListScreen.toBeVisible()` (enforced by `beforeEach`)
4. End every `it()` by navigating back to channel list (clean state for next test)
5. Use `// #` for steps, `// *` for assertions
6. Use testIDs from the page object — never hardcode strings in `by.id()`
7. If a new testID is needed in the app, add it there first, then reference it in the page object
8. Never share state between `it()` blocks — each test must be independent
