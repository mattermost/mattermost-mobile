// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// DDIL Outbound Message Prioritization
//
// Assigns a sync tier to outgoing posts at write time so that when connectivity
// restores after a blackout, the retry flush can send the most critical messages
// first — especially under constrained bandwidth.
//
// The signals read here already exist in the codebase:
//   - PostPriorityType (urgent/important) from app/constants/post.ts
//   - Channel type (DM, GM, public, private) from app/constants/general.ts
//   - @mention patterns from the message body
//
// None of these signals are currently used in the send/retry path.

import {General} from '@constants';
import {PostPriorityType} from '@constants/post';

// Ordered tiers — lower number = higher priority in the retry queue.
// Using a const object + companion type instead of enum for tree-shaking.
export const SyncPriority = {
    URGENT: 0,   // DMs, @mentions, user-flagged urgent
    NORMAL: 1,   // Standard channel messages
    DEFERRED: 2, // File-only posts, low-signal content
} as const;

export type SyncPriority = typeof SyncPriority[keyof typeof SyncPriority];

// Matches @username mentions but NOT @channel, @here, @all (broadcast mentions).
// Those reach everyone and aren't person-specific urgent signals.
const DIRECT_MENTION_REGEX = /\B@[a-z0-9._-]+/i;
const BROADCAST_MENTIONS = new Set(['@channel', '@here', '@all']);

function containsDirectUserMention(message: string): boolean {
    const matches = message.match(DIRECT_MENTION_REGEX);
    if (!matches) {
        return false;
    }
    return matches.some((m) => !BROADCAST_MENTIONS.has(m.toLowerCase()));
}

/**
 * Derives the sync priority for an outbound post based on existing signals.
 *
 * Called at post creation time. The result is written to `post.sync_priority`
 * and used by retryFailedPosts() to order the reconnect flush.
 *
 * @param post - The post being created (needs message, metadata, file_ids)
 * @param channelType - The channel's type (D, G, O, P)
 */
export function deriveSyncPriority(
    post: Pick<Post, 'message' | 'metadata' | 'file_ids'>,
    channelType: string,
): SyncPriority {
    // User explicitly marked this post as urgent — respect that signal
    if (post.metadata?.priority?.priority === PostPriorityType.URGENT) {
        return SyncPriority.URGENT;
    }

    // DMs are inherently urgent in a DDIL context — direct person-to-person
    if (channelType === General.DM_CHANNEL) {
        return SyncPriority.URGENT;
    }

    // @mention to a specific user (not a broadcast)
    if (containsDirectUserMention(post.message)) {
        return SyncPriority.URGENT;
    }

    // DECISION POINT: Should GM (group message) channels be URGENT?
    // Argument for: GMs are small-group, high-signal conversations
    // Argument against: Some GMs are used as lightweight channels
    // Currently: NORMAL — but this is worth discussing with the team
    // if (channelType === General.GM_CHANNEL) {
    //     return SyncPriority.URGENT;
    // }

    // Posts with file attachments — the message text is the critical payload,
    // but if the post is file-only (empty message), it can wait.
    // DECISION POINT: Should we split file uploads from their parent post?
    // That's a bigger change — keeping them atomic for now.
    if (post.file_ids?.length && !post.message.trim()) {
        return SyncPriority.DEFERRED;
    }

    return SyncPriority.NORMAL;
}
