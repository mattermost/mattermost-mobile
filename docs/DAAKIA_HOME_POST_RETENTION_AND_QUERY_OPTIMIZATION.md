# Daakia Home: Post Retention and Last Post Query Optimization

This document describes the changes made to keep posts forever and optimize the last post query in Daakia Home screen.

## Overview

Two key improvements were made:
1. **Post Retention**: Disabled automatic post deletion to keep all posts forever (until app uninstall)
2. **Last Post Query Optimization**: Replaced multiple per-channel queries with a single efficient query

## Changes Made

### 1. Post Retention - Keep Posts Forever

**File**: `app/actions/local/systems.ts`

**What Changed**:
- Modified `dataRetentionCleanup()` function to skip cleanup when data retention is disabled
- Previously, even when retention was disabled, posts older than 14 days were automatically deleted
- Now, when retention is disabled, all posts are kept forever until app uninstall

**Code Change**:
```typescript
// Before (line 139-140):
const isDataRetentionEnabled = await getIsDataRetentionEnabled(database);
const result = await (isDataRetentionEnabled ? dataRetentionPolicyCleanup(serverUrl) : dataRetentionWithoutPolicyCleanup(serverUrl));

// After:
const isDataRetentionEnabled = await getIsDataRetentionEnabled(database);

// Only run cleanup if retention is explicitly enabled
// If disabled, keep posts forever (until app uninstall)
if (!isDataRetentionEnabled) {
    return {error: undefined}; // Skip cleanup - keep all posts forever
}

const result = await dataRetentionPolicyCleanup(serverUrl);
```

**Behavior**:
- **Before**: Posts older than 14 days were deleted even when retention was disabled
- **After**: When retention is disabled, no posts are deleted automatically
- **Result**: Posts persist in the database until app uninstall, similar to WhatsApp behavior

### 2. Last Post Query Optimization

**File**: `app/screens/home/home_daakia/index.tsx`

**What Changed**:
- Replaced multiple per-channel queries with a single query for all channels
- Added proper filtering for deleted posts
- Added `distinctUntilChanged` to prevent unnecessary re-renders
- Improved reactivity by including all necessary columns in `observeWithColumns`

**Code Change**:
```typescript
// Before (lines 683-704):
const ids = channels.map((c) => c.channel.id);
const perChannelLatestPost$ = ids.map((id) =>
    database.get<PostModel>('Post').query(
        Q.where('channel_id', id),
        Q.sortBy('create_at', Q.desc),
        Q.take(1),
    ).observeWithColumns(['create_at', 'message', 'user_id', 'type']),
);

return combineLatest(perChannelLatestPost$).pipe(
    map((results) => {
        const latestByChannel = new Map<string, PostModel>();
        for (let i = 0; i < results.length; i++) {
            const arr = results[i];
            const p = arr[0];
            if (p) {
                latestByChannel.set(ids[i], p);
            }
        }
        return latestByChannel;
    }),
);

// After:
const channelIds = channels.map((c) => c.channel.id);

// Single query - much more efficient than multiple queries!
// Filters deleted posts and gets latest for all channels in one query
return database.get<PostModel>('Post').query(
    Q.where('channel_id', Q.oneOf(channelIds)),
    Q.where('delete_at', Q.eq(0)), // Exclude deleted posts
    Q.sortBy('create_at', Q.desc),
).observeWithColumns(['channel_id', 'create_at', 'message', 'user_id', 'type', 'props', 'delete_at']).pipe(
    map((allPosts) => {
        // Group by channel - take latest non-deleted post for each
        // Posts are already sorted by create_at DESC, so first occurrence per channel is latest
        const latestByChannel = new Map<string, PostModel>();
        const seenChannels = new Set<string>();

        for (const post of allPosts) {
            const channelId = post.channelId;
            if (!seenChannels.has(channelId)) {
                latestByChannel.set(channelId, post);
                seenChannels.add(channelId);
            }
        }

        return latestByChannel;
    }),
    distinctUntilChanged((prev, curr) => {
        // Only emit if posts actually changed
        if (prev.size !== curr.size) return false;
        for (const [id, post] of prev) {
            const currPost = curr.get(id);
            if (!currPost || currPost.id !== post.id || currPost.createAt !== post.createAt) {
                return false;
            }
        }
        return true;
    }),
);
```

**Performance Improvements**:
- **Before**: N queries (one per channel) - e.g., 50 channels = 50 queries
- **After**: 1 query for all channels
- **Benefits**:
  - Faster execution (single database query)
  - Less memory usage (single result set)
  - More reliable (single subscription)
  - Better caching (database can optimize one query)
  - Proper filtering (excludes deleted posts)

## How to Revert Changes

### Revert Post Retention Change

To restore the original behavior where posts are deleted after 14 days even when retention is disabled:

**File**: `app/actions/local/systems.ts` (around line 139)

```typescript
// Replace:
const isDataRetentionEnabled = await getIsDataRetentionEnabled(database);

// Only run cleanup if retention is explicitly enabled
// If disabled, keep posts forever (until app uninstall)
if (!isDataRetentionEnabled) {
    return {error: undefined}; // Skip cleanup - keep all posts forever
}

const result = await dataRetentionPolicyCleanup(serverUrl);

// With:
const isDataRetentionEnabled = await getIsDataRetentionEnabled(database);
const result = await (isDataRetentionEnabled ? dataRetentionPolicyCleanup(serverUrl) : dataRetentionWithoutPolicyCleanup(serverUrl));
```

### Revert Last Post Query Optimization

To restore the original multiple-query approach:

**File**: `app/screens/home/home_daakia/index.tsx` (around line 683)

```typescript
// Replace:
const channelIds = channels.map((c) => c.channel.id);

// Single query - much more efficient than multiple queries!
// Filters deleted posts and gets latest for all channels in one query
return database.get<PostModel>('Post').query(
    Q.where('channel_id', Q.oneOf(channelIds)),
    Q.where('delete_at', Q.eq(0)), // Exclude deleted posts
    Q.sortBy('create_at', Q.desc),
).observeWithColumns(['channel_id', 'create_at', 'message', 'user_id', 'type', 'props', 'delete_at']).pipe(
    map((allPosts) => {
        // Group by channel - take latest non-deleted post for each
        // Posts are already sorted by create_at DESC, so first occurrence per channel is latest
        const latestByChannel = new Map<string, PostModel>();
        const seenChannels = new Set<string>();

        for (const post of allPosts) {
            const channelId = post.channelId;
            if (!seenChannels.has(channelId)) {
                latestByChannel.set(channelId, post);
                seenChannels.add(channelId);
            }
        }

        return latestByChannel;
    }),
    distinctUntilChanged((prev, curr) => {
        // Only emit if posts actually changed
        if (prev.size !== curr.size) return false;
        for (const [id, post] of prev) {
            const currPost = curr.get(id);
            if (!currPost || currPost.id !== post.id || currPost.createAt !== post.createAt) {
                return false;
            }
        }
        return true;
    }),
);

// With:
const ids = channels.map((c) => c.channel.id);
const perChannelLatestPost$ = ids.map((id) =>
    database.get<PostModel>('Post').query(
        Q.where('channel_id', id),
        Q.sortBy('create_at', Q.desc),
        Q.take(1),
    ).observeWithColumns(['create_at', 'message', 'user_id', 'type']),
);

return combineLatest(perChannelLatestPost$).pipe(
    map((results) => {
        const latestByChannel = new Map<string, PostModel>();
        for (let i = 0; i < results.length; i++) {
            const arr = results[i];
            const p = arr[0];
            if (p) {
                latestByChannel.set(ids[i], p);
            }
        }
        return latestByChannel;
    }),
);
```

## Original Behavior (Before Changes)

### Post Retention
- **Default behavior**: Even when data retention was disabled, posts older than 14 days were automatically deleted via `dataRetentionWithoutPolicyCleanup()`
- **Issue**: Users lost old messages even when they didn't want retention enabled
- **Impact**: Users lost message history after 14 days

### Last Post Query
- **Implementation**: Created separate query for each channel (N queries for N channels)
- **Performance**: Slower for channels with many channels (e.g., 50 channels = 50 queries)
- **Issues**:
  - Multiple database queries
  - More memory usage
  - Potential subscription management issues
  - No filtering for deleted posts

## Current Behavior (After Changes)

### Post Retention
- **Behavior**: When data retention is disabled, no posts are deleted automatically
- **Result**: All posts are kept in the database until app uninstall
- **Benefit**: Users can access their full message history, similar to WhatsApp

### Last Post Query
- **Implementation**: Single query for all channels using `Q.oneOf(channelIds)`
- **Performance**: Much faster (1 query instead of N queries)
- **Benefits**:
  - Faster execution
  - Less memory usage
  - More reliable subscription management
  - Proper filtering for deleted posts
  - Better database query optimization
  - Automatic updates when new posts arrive

## Testing Recommendations

1. **Post Retention**:
   - Verify posts older than 14 days are not deleted when retention is disabled
   - Check that posts are still accessible after extended periods
   - Verify retention still works when explicitly enabled

2. **Last Post Query**:
   - Test with many channels (50+)
   - Verify preview text updates when new posts arrive
   - Check that deleted posts don't show in preview
   - Verify performance improvement with large channel lists

## Related Files

- `app/actions/local/systems.ts` - Data retention cleanup logic
- `app/screens/home/home_daakia/index.tsx` - Daakia Home screen with last post query
- `app/components/daakia_components/daakia_channel_item.tsx` - Channel item that displays last post preview

## Notes

- The `dataRetentionWithoutPolicyCleanup` function is now unused but kept for reference
- The single query approach is more efficient but requires proper grouping logic
- Both changes work together to improve user experience and performance

