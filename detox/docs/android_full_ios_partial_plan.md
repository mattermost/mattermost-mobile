# E2E plan: Android full / iOS partial

Companion plan for [PR #10032](https://github.com/mattermost/mattermost-mobile/pull/10032) (Detox + Maestro orchestration via [Test System IO](https://github.com/mattermost/mattermost-test-system-io)).

## Goal

Cut the iOS critical path on **PR** E2E while keeping coverage. **Android owns the full functional matrix**; **iOS PR runs a tagged slice** of phone specs plus the separate iPad job. `MAIN` / `MASTER` / `RELEASE` keep full Detox iOS phone suite.

## How PR specs are identified / tagged

Convention (Detox + Maestro): plan tags are **`@snake_case`**, always `@`-prefixed. In Maestro YAML they must be **quoted** (`- "@android_only"`) — unquoted `@` is invalid YAML. **Untagged = applies to all** — do not invent a `shared` tag. Prefer include/exclude tags over directory filters.

### Maestro — plan tags on each flow

Every flow under `detox/maestro/flows/**/*.yml` declares its Zephyr id. Optional plan tags:

| Tag | Dispatch |
|---|---|
| *(none)* | Android + iOS |
| `"@android_only"` | Android only |
| `"@ios_only"` | iOS only |
| `"@multi_device"` | Excluded from single-device CI |

Filter: `detox/maestro/config/exclude_tags.json` → Test System IO `maestro-exclude-tags` (no `maestro-exclude-dir`).

### Detox — `// Tags: @ios_pr` / `@ipad_only`

Test System IO discovers Detox specs as normal `*.e2e.ts` paths under `detox/e2e/test`, then filters by preamble tags:

```ts
// Copyright …
// See LICENSE.txt for license information.

// Tags: @ios_pr
```

| Input | Meaning |
|---|---|
| `detox-include-tags: @ios_pr` | PR iOS phone — only tagged files are registered as dispatch units |
| `detox-include-tags: @ipad_only` | iPad job — only iPad-tagged specs (specs may live anywhere) |
| `detox-include-tags: @smoke` | CMT older-server phone legs — smoke subset (specs may live anywhere) |
| `detox-exclude-tags: @ipad_only` | Phone Android / full iOS — drop iPad-only specs |
| (empty include) | No include filter |

Requires Test System IO `detox-include-tags` / `detox-exclude-tags` ([PR #106](https://github.com/mattermost/mattermost-test-system-io/pull/106)).

Units keep real paths (`e2e/test/products/channels/…/*.e2e.ts`). Workers lease and report them like any other Detox run.

| Leg | PR selection |
|---|---|
| Detox Android | Full tree + exclude `@ipad_only` |
| Detox iPad | Full tree + include `@ipad_only` |
| Detox iOS phone | Full tree + include `@ios_pr` (31 specs below, 20 workers) |

| Run type | Detox iOS phone filter | Workers |
|---|---|---|
| `PR` | `@ios_pr` | 4 |
| `MAIN` / `MASTER` / `RELEASE` | none (full suite) | 20 |

Manage the set with `rg '@ios_pr' detox/e2e --glob '*.e2e.ts'`.

## `@ios_pr` spec catalog (31 files)

Selection rule: cover **distinct primary screens / navigation surfaces** that a PR is likely to regress on iOS, without re-running the full Android matrix. Prefer smoke suites for breadth, then one deeper suite per major screen area.

### Smoke (breadth across core surfaces)

| Spec | Suite | Why it fits `@ios_pr` |
|---|---|---|
| `products/channels/smoke_test/server_login.e2e.ts` | Smoke Test - Server Login | Server URL / login / home entry — iOS keyboard, Secure Text, and first-launch chrome |
| `products/channels/smoke_test/channels.e2e.ts` | Smoke Test - Channels | Channel list, join/create, channel screen — primary phone navigation shell |
| `products/channels/smoke_test/messaging.e2e.ts` | Smoke Test - Messaging | Post draft, send, post list — core composer + keyboard on iOS |
| `products/channels/smoke_test/account.e2e.ts` | Smoke Test - Account | Account tab / profile entry — tab bar and account stack |
| `products/channels/smoke_test/search.e2e.ts` | Smoke Test - Search | Global search entry and results — search UI + keyboard |
| `products/channels/smoke_test/threads.e2e.ts` | Smoke Test - Threads | Global threads tab / thread open — threads surface |
| `products/channels/smoke_test/autocomplete.e2e.ts` | Smoke Test - Autocomplete | @/# suggestions in composer — iOS suggestion list + keyboard |

### Server login / multi-server

| Spec | Suite | Why it fits `@ios_pr` |
|---|---|---|
| `products/channels/server_login/connect_to_server.e2e.ts` | Connect to server | Server form, validation, connect — iOS text fields / URL entry |
| `products/channels/server_login/login_by_email.e2e.ts` | Login by email | Login screen credentials flow — Secure Text / autofill-adjacent UI |
| `products/channels/server_login/server_list.e2e.ts` | Server list | Multi-server list / switch / edit — iOS list + swipe patterns |

### Channels

| Spec | Suite | Why it fits `@ios_pr` |
|---|---|---|
| `products/channels/channels/channel_info.e2e.ts` | Channel info | Channel info sheet/screen — modal/sheet presentation on iOS |
| `products/channels/channels/browse_channels.e2e.ts` | Browse channels | Browse/join public channels — browse list screen |
| `products/channels/channels/create_direct_message.e2e.ts` | Create DM | DM picker / start conversation — people picker + search |
| `products/channels/channels/create_channel_and_edit_channel_header.e2e.ts` | Create channel / edit header | Create-channel form + header edit — form screens |
| `products/channels/channels/find_channels.e2e.ts` | Find channels | Find-channels search — in-app channel finder |
| `products/channels/channels/archive_channel.e2e.ts` | Archive channel | Archive confirm + archived state — alerts/action sheets (includes Android-skipped cases) |

### Channel settings

| Spec | Suite | Why it fits `@ios_pr` |
|---|---|---|
| `products/channels/channel_settings/channel_settings_smoke.e2e.ts` | Channel settings smoke | Settings hub for a channel — settings stack entry |
| `products/channels/channel_settings/channel_navigation.e2e.ts` | Channel navigation | Settings ↔ channel navigation — stack/back on iOS |
| `products/channels/channel_settings/channel_members.e2e.ts` | Channel members | Members list / manage members — members screen |

### Account / settings

| Spec | Suite | Why it fits `@ios_pr` |
|---|---|---|
| `products/channels/account/settings.e2e.ts` | Account - Settings | Settings root — settings navigation shell |
| `products/channels/account/edit_profile.e2e.ts` | Edit profile | Profile edit form — text inputs / avatar affordances |
| `products/channels/account/custom_status.e2e.ts` | Custom status | Custom status picker/modal — status UI |
| `products/channels/account/notification_settings.e2e.ts` | Notification settings | Notification prefs — settings detail + toggles |

### Messaging

| Spec | Suite | Why it fits `@ios_pr` |
|---|---|---|
| `products/channels/messaging/message_reply.e2e.ts` | Message reply | Reply / thread from post options — post options + thread (includes Android-skipped cases) |
| `products/channels/messaging/message_draft.e2e.ts` | Message draft | Draft persistence in composer — draft bar / keyboard |
| `products/channels/messaging/emojis_and_reactions.e2e.ts` | Emojis and reactions | Emoji picker + reactions — picker presentation on iOS |
| `products/channels/messaging/pin_and_unpin_message.e2e.ts` | Pin / unpin | Pin actions + pinned list — post options |

### Search / threads / teams

| Spec | Suite | Why it fits `@ios_pr` |
|---|---|---|
| `products/channels/search/recent_mentions.e2e.ts` | Recent mentions | Mentions search/results — mentions screen |
| `products/channels/search/saved_messages.e2e.ts` | Saved messages | Saved messages list — saved screen |
| `products/channels/threads/global_threads.e2e.ts` | Global threads | Threads list + open thread — threads product surface |
| `products/channels/teams/team_switching.e2e.ts` | Team switching | Team sidebar / switcher — team picker on phone |

## Out of scope

- No orchestrator retries (`retest-on-fail: false` stays)
- No rename of `e2e-detox-pr.yml` (Matterwick entry)
- iPad remains its own job (not tagged `@ios_pr`)

## Checklist

- [x] Maestro platform tags + exclude_tags filters
- [x] Detox `// Tags: @ios_pr` + Test System IO include-tags discovery
- [x] ~31 screen-representative iOS PR specs catalogued
- [x] PR workflows register real paths through orchestration
- [ ] Re-run PR E2E and confirm all platforms green
