# PR #10093 flake diagnoses — run 33122005735 (branch MM-70406-check-mic-perm @ 3e67acda7)

Format follows detox/CLAUDE.md: (1) action dispatched? (2) handler ran? (3) side effect? (4) UI
state? → root cause → fix locus. Artifact dirs: /tmp/e2e-ev2/{i10,i9,a10} (large shards),
is4..is20 (small result bundles). TSIO groups: iOS 01a0458d-e3cd (504P/10F), Android
01a045a5-ed40 (517P/8F); main comparisons 01a04835 (ios 3F), 01a043f1 (ios 3F), 01a041a0 (ios 1F),
01a04810/01a043ee/01a04182/01a0417b (android, 0F each).

NOTE: screenshots could not be visually rendered in this session (no image support in the
model). iOS failure analysis used the full viewHierarchy XML embedded in detox.log failure
entries (element ids + labels + frames) — that is the on-screen content at failure. Android
used per-test device.log (logcat) + DetoxWSClient action traffic + jest-results.

## Failure matrix (labels)

| Cluster | Tests | Platform | Label |
|---|---|---|---|
| A sidebar/DM invisible | MM-T245_1, MM-T246_1, MM-T248_1 | iOS | rotating flake (fails on main ios run 01a04835 with same trio, different channel id channel-ed4882; other main runs rotate to different tests) |
| B classification banner | MM-T6209_1..MM-T6214_1 (6) | iOS | environmental: shared-flag churn across concurrent classification shards + app-side 1h cache |
| C unfollow thread | MM-T4806_4 | iOS | transient network failure on the unfollow API call, unverified server-side by the test |
| D ReactContext null | MM-T4988_2 | Android | app-side Fabric mount crash destroys the JS instance (NOT harness timing) |
| E account screen | MM-T3251, MM-T4988_3/4/5, MM-T3472×2, MM-T2056 | Android | cascade from D (same suite, after it; next suite recovered) |

Main iOS comparison runs fail on ROTATING tests (run 01a04835: A trio; run 01a043f1:
MM-T4806_3 + MM-T5608_1 + MM-T4864_1; run 01a041a0: MM-T69455_1) — A is the flake floor.
Main Android is 0-fail, so D/E are specific to heavier Android CI conditions, not PR-specific
(PR = mic-permission change only; none of these clusters touch it).

## Cluster A — "Couldn't load categories" error state blocks the sidebar (3 tests)

1. Action dispatched: YES — the failing step was a WAIT, not a tap: helpers poll for
   channel/category display names for up to 60s (245_1/246_1) and the spec polls the DM item
   10s (248_1).
2. Handler ran: N/A — nothing to run against; the categories list never rendered.
3. Side effect: the helper's probe log (detox.log:71762, run 33122005735 shard 10) shows after
   60s: `channel_list.screen=present; team_display_name=present; ALL category headers=absent`.
4. UI state: the hierarchy at failure shows the app's OWN error screen — labels
   `"Couldn't load categories for Server 1"`, `"There was a problem loading content for this
   server."`, `"Retry"` — with NO `channel_list.flat_list` (categories.tsx:229 renders
   `<LoadCategoriesError/>` when the flattened category list is empty after the initial load).
   MM-T248_1's failure hierarchy: identical error state, no DM category.

Root cause: the app's initial team/channel load failed transiently (device.log:
`error on fetchChannelById Response with status code 403` at 22:54:50) and the app parked on
its error screen; the tests never recover it. The suite order proves the server was healthy:
the suites before and after mark_as_unread in the same worker passed (jest-results
timestamps 22:49→22:53 and 22:56→23:00+).

Fix: ChannelListScreen.toBeVisible() taps the app's own Retry control when the error state is
detected (flat_list missing + loading gone + Retry visible), then waits for the list; the
existing relaunch fallback stays for everything else. The per-spec Retry probe in
mark_as_unread.e2e.ts (which my branch already carried) is superseded by the shared helper.

## Cluster B — classification banner absent (6 tests, all TOBEVISIBLE(30s) on global_classification_banner)

1. Provisioning DID run and DID verify: beforeAll acquires a cross-shard lock (20m),
   `enableClassificationMarkings` patches FeatureFlagClassificationMarkings=true and
   **verifies via the same client-config endpoint the app consumes**
   (System.waitForClientConfigFlag → GET /config/client?format=old, up to 60×1s), seeds
   property fields (every step throws on failure), logs in, reloads. The tests reached their
   bodies, so provisioning succeeded.
2. Failure hierarchy: `recent_mentions.screen` present with the "No Mentions yet" empty
   state; NO `global_classification_banner` element anywhere — absent, not off-screen.
3. The ONLY classification log in each app session (PID 52863 at 22:43:29, PID 32304 at
   23:07:00): `fetchClassificationBanner skipped; cached data still fresh` — no
   "No classification fields returned", no error log. The skip means an earlier fetch in the
   same JS context marked the 1-hour cache (CLASSIFICATION_BANNER_CACHE_TTL, classification.ts:48);
   the only fetch path that marks the cache WITHOUT logging is the **feature-disabled path**
   (classification.ts:71-85) — i.e., the app's DB config said flag=false at entry, seconds
   after the test's client-config poll had verified true.
4. Why the flag flipped: three classification suites ran CONCURRENTLY on shards 9/18/20 and
   all mutate the same server-global flag:
   - shard 20 (offline suite) 22:39:06→22:43:00 — holds the lock, afterAll patches flag=false;
   - shard 9 (across_screens) 22:42:13→22:50:27 — acquires the lock ~22:43:00, holds it
     until afterAll;
   - shard 18 (global suite) 22:44:43→22:57:58 — its beforeAll patches
     `ClassificationMarkings: false` (global_classification_banner.e2e.ts:37) and its
     per-test afterEach cleans classification data — i.e., it mutated the flag INSIDE
     shard 9's lock window (math: its 10 tests total 10.2 min and the suite ended 22:57:58,
     so it cannot have waited for shard 9's lock release at ~22:50:27).
   The lock only confirms ownership once at acquire (write + re-read); a later write
   overwrites the single admin-preference row last-write-wins, and owners never re-check —
   so the "lock" provides no mutual exclusion under this race.
5. Why one stale read poisons the whole suite: the entry-time forced fetch
   (websocket/index.ts:106, force=true) read the flag as false (config churn window) and took
   the silent disabled path, marking the cache. The container's effect computes
   `flagChanged` from a ref initialized with the CURRENT values
   (global_classification_banner_container.tsx:48-54), so on first mount after the flip it
   issues a NON-forced fetch → skipped → no retry path until the 1h TTL expires. Six tests ×
   30s of timeouts follow.

Fix (test-side): `assertClassificationLockOwnership()` re-validates the lock in each
classification suite's beforeEach and before config mutations — a steal now fails fast with a
message naming the current holder instead of six opaque timeouts; across_screens' beforeEach
also re-verifies the flag via the client config and re-enables if it was flipped (the suite
holds the lock, so re-enabling is its own precondition, not a race with the thief).

Ticket (app, out of detox scope): the 1-hour silent cache + no force-fetch when the container
mounts after a config flip means one stale config read disables the banner for the session.
The disabled path should not mark the fetched-cache (or the container should force a fetch
when enabled flips to true before its first mount).

## Cluster C — unfollow via thread options leaves the item in the list (MM-T4806_4)

1. Tap dispatched: YES — longPress on the thread item (msgId 441) opened the options; the
   following option passed a 10s visibility wait; tap on
   `post_options.following_thread.option` performed (msgId 444, detox.log 23:16:4x).
2. Handler ran: YES — the app called `updateThreadFollowing` (thread.ts:185).
3. Side effect: FAILED — device.log: `error on updateThreadFollowing [object Object];
   URLSessionTask failed with error: cannot parse response`, immediately followed by
   `websocket closed ... re-established connection`. The unfollow never persisted; local state
   stays is_following=true (the error path only logs, thread.ts:207-210).
4. UI state: the failure hierarchy still lists the test's thread
   (`global_threads.threads_list.thread_item.h1b4qrqyytns8b71wbt6gxw8hc`) among 4 items; the
   test asserted with a bare `expect(...).not.toBeVisible()` 2s after the tap.

Root cause: transient transport failure on the ephemeral test server during the unfollow
call; the test asserted the UI without ever verifying the server accepted the change.
Fix: verify server state first (bounded poll of
GET /users/me/teams/{team_id}/threads/{thread_id} → is_following === false via new
`Thread.apiGetThreadFollowed`), then assert the UI with waitFor-not-exist. If the server
never confirms, the test fails naming the mechanism instead of an opaque matcher timeout.

## Cluster D + E — one Fabric crash poisons an Android shard (1 + 7 failures)

Timeline (a10 shard, account_menu.e2e.ts, one app process PID 4680, device local time
UTC+4h... timestamps shown as logged):

1. 19:04:00–09 — presence flow: taps on user status options (offline → away → dnd) succeed
   (detox invoke IDs 74/78/80, each with a visibility gate).
2. 19:04:09.350 — DURING the away tap's frame callback:
   `SurfaceMountingManager: java.lang.IllegalStateException: addViewAt: cannot insert view
   [1014] into parent [1026]: View already has a parent: [1024]` (Fabric mount).
3. 19:04:09.361 — `ReactHost{0}.raiseSoftException(getOrCreateDestroyTask()):
   handleHostException(...)` → 19:04:09.394 `reactInstance is null. Dropping work.` — the JS
   instance is DESTROYED; the OS process survives (PID keeps logging).
4. 19:04:10.762 — Detox waits 20s for `account.screen` (matcher 'not null', ~27ms polls,
   hundreds of "Checking ... not null" lines) — never matches (the tree is gone).
5. 19:04:29.7 — wait times out (testFailed #81); 19:04:29.755 — setSynchronization(true) →
   `ReactContext is null!` from FabricDetoxIdlingResourceFactoryStrategy → testFailed #83 =
   the error TSIO reports for MM-T4988_2.
6. The existing bounded retry in safeEnableSynchronization (0.5+1+2s, 4 attempts —
   detox.log 23:04:30.8/31.3/32.3/34.3) cannot fix a DESTROYED instance (only a slow-starting
   one), so it rethrows.
7. Cascade: Detox REUSES the still-running (dead-JS) app for every following test in the
   suite; all 7 fail `AccountScreen.toBeVisible` 20s at account.ts:94 (23:04:34→23:07:46).
   The NEXT suite (advanced_settings, 23:07:46) passes — its beforeAll relaunches the app.

Task-label correction: D is NOT "RN context not ready when synchronization is toggled" — the
context was alive at 23:03:18's successful enable and was destroyed at 19:04:09 by the
app-side Fabric crash. The crash itself (addViewAt / view-reparenting race in the presence
options flow) is an APP bug — ticket it with the stack above; it is the test's own subject
flow, so MM-T4988_2 stays red until the app fix.

Fix (detox-side, cuts the cascade):
- safeEnableSynchronization: after the existing bounded retries, a persistent ReactContext-null
  means the instance is destroyed → relaunch the app with newInstance (the recovery pattern
  ChannelListScreen.toBeVisible already uses) so the worker is healed for later tests.
- account_menu beforeEach re-establishes its precondition (re-open the account drawer after a
  relaunch reset it) instead of asserting a state a relaunch cannot restore.

## What was run locally vs deferred to CI

Not runnable in this session: no local iOS simulator build/Android emulator, and native
builds take 10–30 min per platform (repo CLAUDE.md). Verification executed: detox lint+tsc,
app tsc, eslint on changed files, gate-check. The proof run is CI: E2E workflow on the
stabilization branch — iOS suite for classification_banner + mark_as_unread +
follow_unfollow_thread shards, Android suite for the Account Menu shard, ideally re-run ×2
for the rotating flakes.