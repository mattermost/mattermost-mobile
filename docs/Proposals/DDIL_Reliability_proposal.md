# DDIL Reliability: Outbound Message Prioritization

**Prepared by:** Kyle Venenga  
**Date:** April 2026  
**Repo:** `mattermost/mattermost-mobile`  
**Key files:** `app/actions/remote/post.ts` · `app/actions/websocket/index.ts` · `app/managers/network_performance_manager.ts` · `app/database/models/server/post.ts` · `types/api/posts.d.ts`

---

## What I was looking at

Jesse mentioned the conversation we had about reliability in degraded network environments, specifically what Artemis II probably had to do after coming back around the moon and reestablishing contact with Earth. The question that stuck with me: when you have a narrow bandwidth window and a backlog of queued messages, what goes first?

I cloned the repo and spent a while tracing the send path end-to-end before writing anything down.

---

## What I found

### 1. `failed` state lives in an unindexed JSON blob

In `app/database/models/server/post.ts`, the Post model stores failure state inside the `props` JSON column:

```typescript
// Current — in post.ts
@json('props', safeParseJSON) props!: any;
// failed is set as props.failed = true
```

There's no way to efficiently query for failed posts. No index, no column, just a key buried in a JSON string. To find all failed posts you'd have to load every post and deserialize `props` in JavaScript. After a long blackout with a bunch of queued messages, that's going to hurt.

### 2. The reconnect path handles incoming data but ignores outbound

`doReconnect()` in `app/actions/websocket/index.ts` does solid work orchestrating the inbound sync:

```typescript
// Immediate (blocking)
const entryData = await entry(serverUrl, currentTeamId, currentChannelId, ...);

// Screen-aware post fetch
await fetchPostDataIfNeeded(serverUrl, groupLabel);

// Deferred (non-blocking)
await deferredAppEntryActions(serverUrl, ...);
```

The two-tier structure here is well thought out. But the outbound side is just... empty. Failed posts sit there with `props.failed = true` until the user taps retry on each one individually. No automatic flush after reconnect.

### 3. `NetworkPerformanceManager` exists but nothing reads it in the send path

`app/managers/network_performance_manager.ts` already tracks request latency: sliding window of 20 requests, 70% threshold to flip to "slow." It has a clean observable:

```typescript
NetworkPerformanceManager.observePerformanceState(serverUrl);
// Returns Observable<'normal' | 'slow'>

NetworkPerformanceManager.getCurrentPerformanceState(serverUrl);
// Returns 'normal' | 'slow' synchronously
```

This drives the connection banner in the UI, but nobody reads it when deciding what to send. The infrastructure is there, just not wired up.

### 4. `PostPriorityType` exists but only affects how things look

From `app/constants/post.ts`:

```typescript
export enum PostPriorityType {
  STANDARD = "",
  URGENT = "urgent",
  IMPORTANT = "important",
}
```

Red/blue styling, persistent notifications, display stuff. When messages queue up offline and connectivity comes back, they all flush in creation order regardless of this flag. The signal is right there, we're just not using it.

---

## Current flow

```
User taps send
      |
      v
createPost() in app/actions/remote/post.ts
      |
      v
Write to WatermelonDB immediately          <-- offline-first, this is correct
(pending_post_id = userId:timestamp)
      |
      v
client.createPost(), HTTP POST to server
      |
      |-- success --> handlePosts with server-assigned ID
      |               batchRecords(models, 'createPost - success')
      |
      |-- failure --> errorPost with props.failed = true
      |               batchRecords(models, 'createPost - failure')
      |
      |-- hung for 10s --> isPostFailed() catches it at render time:
                           pendingPostId === id && Date.now() > updateAt + 10000
                           (no explicit timeout, the UI just decides it's dead)

      Either way, failed post sits there until user manually taps Retry.
```

```
Network restores
      |
      v
WebsocketManager detects via NetInfo
      |
      v
doReconnect()
      |-- entry()                    config, teams, channels        [handled]
      |-- fetchPostDataIfNeeded()    posts for visible screen      [handled]
      |-- deferredAppEntryActions()  background sync               [handled]
      |
      x   retryFailedPosts()        outbound failed messages       [missing]
```

---

## Proposed changes

Three changes, each building on the last.

---

### Change 1: Move `failed` to a proper indexed column

This is the prerequisite. Can't do anything useful without being able to query failed posts efficiently.

One thing to think about: the UI currently reads `props.failed` to show the failure indicator. We're adding a new column, not removing the old one, so both need to stay in sync during the transition. `isPostFailed()` in `app/utils/post/index.ts` should check both: the new column for new posts, `props.failed` for backward compat with posts written before the migration.

**Migration** (additive, no existing data affected):

```typescript
// app/database/migration/server/index.ts, toVersion: 20
{
    toVersion: 20,
    steps: [
        addColumns({
            table: MM_TABLES.SERVER.POST,
            columns: [
                {name: 'failed', type: 'boolean', isOptional: true},
                {name: 'sync_priority', type: 'number', isOptional: true},
            ],
        }),
    ],
},
```

**Schema** - add both columns (with `failed` indexed) in `app/database/schema/server/table_schemas/post.ts`:

```typescript
{name: 'failed', type: 'boolean', isOptional: true, isIndexed: true},
{name: 'sync_priority', type: 'number', isOptional: true},
```

**Bump schema version** to 20 in `app/database/schema/server/index.ts`.

**Model update** - two new fields in `app/database/models/server/post.ts`:

```typescript
@field('failed') failed!: boolean;
@field('sync_priority') syncPriority!: number;
```

**Type update** - add optional fields to the `Post` API type in `types/api/posts.d.ts`:

```typescript
failed?: boolean;
sync_priority?: number;
```

These are optional because server-originated posts won't carry them. They only matter for locally-created outbound posts.

**Type update** - add fields to the `PostModel` interface in `types/database/models/servers/post.ts`:

```typescript
failed: boolean;
syncPriority: number;
```

**Write path update** - in the `createPost` and `retryFailedPost` catch blocks, set both:

```typescript
// Keep props.failed for backward compat with UI reads
props: { ...post.props, failed: true },
// New indexed column
// failed: true,
```

That's it for Change 1. The model is richer, queries are fast, nothing behavioral changes.

---

### Change 2: Priority assignment at write time

New utility: `app/utils/sync_priority.ts`

Reads signals that already exist (`PostPriorityType`, channel type, @mention patterns) and assigns a sync tier. Uses a const object with companion type (not an enum) for tree-shaking, per project convention.

```typescript
import { General } from "@constants";
import { PostPriorityType } from "@constants/post";

export const SyncPriority = {
  URGENT: 0, // DMs, @mentions, user-flagged urgent
  NORMAL: 1, // Standard channel messages
  DEFERRED: 2, // File-only posts (no message text), low-signal content
} as const;

export type SyncPriority = (typeof SyncPriority)[keyof typeof SyncPriority];

const DIRECT_MENTION_REGEX = /\B@[a-z0-9._-]+/i;
const BROADCAST_MENTIONS = new Set(["@channel", "@here", "@all"]);

function containsDirectUserMention(message: string): boolean {
  const matches = message.match(DIRECT_MENTION_REGEX);
  if (!matches) {
    return false;
  }
  return matches.some((m) => !BROADCAST_MENTIONS.has(m.toLowerCase()));
}

export function deriveSyncPriority(
  post: Pick<Post, "message" | "metadata" | "file_ids">,
  channelType: string,
): SyncPriority {
  // User explicitly flagged this as urgent, respect it
  if (post.metadata?.priority?.priority === PostPriorityType.URGENT) {
    return SyncPriority.URGENT;
  }

  // DMs are inherently urgent, direct person-to-person
  if (channelType === General.DM_CHANNEL) {
    return SyncPriority.URGENT;
  }

  // @mention targeting a specific person (not @channel/@here/@all)
  if (containsDirectUserMention(post.message)) {
    return SyncPriority.URGENT;
  }

  // File-only posts with no message body can wait
  if (post.file_ids?.length && !post.message.trim()) {
    return SyncPriority.DEFERRED;
  }

  return SyncPriority.NORMAL;
}
```

Call `deriveSyncPriority()` at post creation time and write the result to `sync_priority` alongside the pending post.

Note: posts with files AND a message body stay NORMAL, not DEFERRED. Only truly empty file-only posts get deprioritized. Felt wrong to defer a message just because someone attached a screenshot.

---

### Change 3: Auto-retry on reconnect, priority-ordered

New function at the bottom of `app/actions/remote/post.ts`:

```typescript
import { Q } from "@nozbe/watermelondb";
import NetworkPerformanceManager from "@managers/network_performance_manager";
import { SyncPriority } from "@utils/sync_priority";

const RETRY_INTER_SEND_DELAY_MS = 150;

export async function retryFailedPosts(serverUrl: string): Promise<void> {
  const { database } = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

  // Read the existing performance manager, no new detection infra
  const networkState =
    NetworkPerformanceManager.getCurrentPerformanceState(serverUrl);
  const isBandwidthConstrained = networkState === "slow";

  // Fast indexed query, only works because failed is a real column now
  const failedPosts = await database
    .get<PostModel>(MM_TABLES.SERVER.POST)
    .query(
      Q.where("failed", true),
      Q.sortBy("sync_priority", Q.asc), // 0 (URGENT) first
      Q.sortBy("create_at", Q.asc), // oldest first within tier
    )
    .fetch();

  if (!failedPosts.length) {
    return;
  }

  logInfo(
    `[DDIL] Retrying ${failedPosts.length} failed posts, network: ${networkState}`,
  );

  for (const post of failedPosts) {
    // On a slow link: only flush URGENT, everything else waits
    if (isBandwidthConstrained && post.syncPriority > SyncPriority.URGENT) {
      logDebug(
        `[DDIL] Deferring post ${post.id} (priority ${post.syncPriority})`,
      );
      continue;
    }

    // Use the existing single-post retry. It handles thread creation,
    // lastPostAt updates, and the auto-delete edge cases (deleted root,
    // read-only town square, plugin dismissal).
    await retryFailedPost(serverUrl, post);

    // Pace sends on a recovering connection
    await new Promise((resolve) =>
      setTimeout(resolve, RETRY_INTER_SEND_DELAY_MS),
    );
  }
}
```

Wire into `doReconnect()` in `app/actions/websocket/index.ts`. One line, placed after inbound sync but before deferred actions:

```typescript
await fetchPostDataIfNeeded(serverUrl, groupLabel);
await retryFailedPosts(serverUrl);          // <-- add this
await deferredAppEntryActions(serverUrl, ...);
```

The placement matters: user sees fresh inbound messages first, then their queued outbound messages start flushing, then background sync continues.

---

## Proposed flow (after changes)

```
Network restores
      |
      v
WebsocketManager --> doReconnect()
      |
      |-- entry(): config, teams, channels
      |-- fetchPostDataIfNeeded(): visible channel posts
      |-- retryFailedPosts()  <-- NEW
      |       |
      |       |-- query: WHERE failed = true
      |       |         ORDER BY sync_priority ASC, create_at ASC
      |       |
      |       |-- check NetworkPerformanceManager
      |       |         if 'slow': only flush URGENT (priority 0)
      |       |         if 'normal': flush all tiers
      |       |
      |       +-- retryFailedPost() for each, 150ms between sends
      |
      +-- deferredAppEntryActions()
```

**The Artemis/DDIL scenario, solved:**

A field operator goes offline for 8 minutes and queues:

1. Status update to team channel - priority 1 (NORMAL)
2. 5MB aerial photo, no caption - priority 2 (DEFERRED)
3. DM to CO: "RTB, weather closing in" - priority 0 (URGENT)
4. Follow-up DM: "Window is 20 min" - priority 0 (URGENT)

Connection restores. `NetworkPerformanceManager` reports `slow`. The flush sends 3 and 4 first, the CO gets the RTB call. Items 1 and 2 wait for the next window or for the link to improve.

---

## Open questions (want your input)

### 1. The `NetworkPerformanceManager` reset problem

When the app comes back to foreground after a blackout, `network_performance_manager.ts` resets all servers to `'normal'`:

```typescript
private cleanupOnAppStateChange = () => {
    Object.keys(this.performanceSubjects).forEach((serverUrl) => {
        this.performanceSubjects[serverUrl].next('normal');
    });
};
```

So `getCurrentPerformanceState()` at the start of `retryFailedPosts()` will almost always say "normal", even if you're connecting through a satellite with 2-second latency. The bandwidth gate basically never triggers.

Three ways to deal with this:

**Option A - Subscribe to the observable during the flush**  
Instead of checking once and getting a stale "normal", subscribe to `observePerformanceState()` and react if state degrades while we're mid-flush. Say we've sent 3 of 10 posts and the state flips to "slow", pause there and only continue with URGENT posts.

- Pro: Most accurate, reacts to real conditions in real time.
- Con: More complex control flow. The flush becomes stateful, it needs to track where it paused and what's left.

**Option B - Wait for the warm-up window**  
The inbound sync (`entry()`, `fetchPostDataIfNeeded()`) generates several HTTP requests before we even get to `retryFailedPosts()`. Let the performance manager accumulate its minimum 4 data points from those requests before flushing non-urgent posts. URGENT posts could still flush immediately.

- Pro: Simple, piggybacks on traffic that's already happening.
- Con: Adds a few seconds of latency to NORMAL/DEFERRED posts. Might not even be noticeable since inbound sync takes time anyway.

**Option C - Let the user decide**  
A toggle somewhere in settings: "DDIL mode" or "Priority-only sync." When it's on, only URGENT posts flush regardless of what the performance manager thinks. The person in the field knows their connection better than any algorithm.

- Pro: No false positives or negatives. Full user control.
- Con: Requires the user to know about it and remember to toggle it. Most users won't.

I lean toward C as the most honest approach for real DDIL deployments, but I'm not sure. This feels like a decision that should come from people who've actually shipped to those environments.

### 2. Starvation

If URGENT messages keep getting generated, NORMAL posts could wait indefinitely. Standard priority queue problem. A simple fix would be promoting any NORMAL post to URGENT after it's been deferred N times or waited longer than X minutes. Didn't build it because I don't know if this actually happens in practice. Seems worth asking before adding the complexity.

### 3. The inter-send delay

The 150ms pause between retried posts is a guess. The idea is to avoid hammering a fragile recovering connection with a burst of requests, but the right number depends entirely on the link. On LTE 150ms is probably unnecessary. On a satellite connection it might need to be 500ms+.

Options: a fixed conservative number, adaptive based on the latency stats the performance manager already has, or just limiting concurrency instead of adding delays (send 3 at a time instead of one-at-a-time-with-pauses).

### 4. File attachment splitting

Right now a post with an attachment is one atomic thing. In an ideal DDIL world you'd send the message text immediately and queue the file upload separately. But that means splitting one outbox entry into two linked entries, which is a bigger structural change. Keeping it out of scope here but worth circling back to.

---

## What this doesn't change

- **The offline-first write path.** Messages still hit WatermelonDB immediately and show up in the UI. This only changes what happens to failed posts when connectivity comes back.
- **Deduplication.** The `pending_post_id` matching and operator upsert logic stays the same.
- **The WatermelonDB sync contract.** Everything here is application-layer.
- **Server behavior.** The server just receives posts in a different order. It doesn't need to know or care about the prioritization.

_Happy to dig into any of this further on the call. Looking forward to it._
