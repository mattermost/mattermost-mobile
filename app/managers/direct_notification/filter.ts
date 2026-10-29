// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

import type {UserMentionKey} from '@typings/global/markdown';

export type DirectNotificationFilterInput = {
    post: Post;
    currentUserId: string;
    userNotifyProps: Partial<UserNotifyProps>;
    channelNotifyProps?: Partial<ChannelNotifyProps>;
    channelType?: ChannelType;
    isCRTEnabled: boolean;
    isFollowingThread?: boolean;
    mentions?: string[];
    status?: string;
};

function hasProp(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
}

function isWebhook(post: Post): boolean {
    return post.props?.from_webhook === 'true' || post.props?.from_webhook === true;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GM WebSocket mentions include all members. This helper supplies the missing
 * explicit-mention distinction for a GM channel-level mention override.
 */
export function hasExplicitMessageMention(post: Post, mentionKeys: UserMentionKey[], username: string): boolean {
    const message = post.message || '';
    if (!message) {
        return false;
    }

    let keys = mentionKeys;
    if (!keys.length && username) {
        keys = [{key: `@${username}`}];
    }
    return keys.some(({key, caseSensitive}) => {
        const trimmedKey = key.trim();
        if (!trimmedKey) {
            return false;
        }
        const pattern = `(^|[^A-Za-z0-9_])${escapeRegExp(trimmedKey)}($|[^A-Za-z0-9_])`;
        return new RegExp(pattern, caseSensitive ? '' : 'i').test(message);
    });
}

/**
 * Mirrors the mobile-relevant parts of Mattermost's push notification rules.
 * The WebSocket event already contains server-computed mention IDs, so Direct
 * does not need to re-parse every message or notify for every posted event.
 *
 * The server also considers the receiver's active channel and last activity
 * timestamp for push_status=online. Those timestamps are not present in the
 * mobile user record; foreground display is handled separately and Direct
 * treats a backgrounded app as eligible for online notifications.
 */
export function shouldDeliverDirectNotification({
    post,
    currentUserId,
    userNotifyProps,
    channelNotifyProps = {},
    channelType,
    isCRTEnabled,
    isFollowingThread = false,
    mentions = [],
    status = General.ONLINE,
}: DirectNotificationFilterInput): boolean {
    // This is an explicit server/integration request and follows the server's
    // force_notification behavior, including bypassing normal status checks.
    if (hasProp(post.props?.force_notification)) {
        return true;
    }

    if (post.user_id === currentUserId && !isWebhook(post)) {
        return false;
    }

    if (post.type?.startsWith('system_') || hasProp(post.props?.silent_notification)) {
        return false;
    }

    if (status === General.DND || status === General.OUT_OF_OFFICE) {
        return false;
    }

    const userLevel = userNotifyProps.push || General.MENTION;
    const channelLevel = channelNotifyProps.push || 'default';
    let effectiveLevel: string = channelLevel === 'default' ? userLevel : channelLevel;

    // Mattermost promotes the default GM mention preference to all activity.
    if (channelType === General.GM_CHANNEL && channelLevel === 'default' && userLevel === General.MENTION) {
        effectiveLevel = 'all';
    }

    if (channelNotifyProps.mark_unread === General.MENTION || effectiveLevel === 'none') {
        return false;
    }

    const wasMentioned = mentions.includes(currentUserId);
    const isCRTReply = isCRTEnabled && Boolean(post.root_id);

    if (isCRTReply && !wasMentioned) {
        // With CRT enabled, ordinary all-activity notifications do not cover
        // replies to threads the user is not following.
        if (!isFollowingThread) {
            return false;
        }

        if (channelLevel === 'default') {
            const threadLevel = userNotifyProps.push_threads || 'all';
            if (userLevel === 'none' || (threadLevel !== 'all' && userLevel !== 'all')) {
                return false;
            }
        } else {
            const threadLevel = channelNotifyProps.push_threads || 'mention';
            if (channelLevel === 'none' || (threadLevel !== 'all' && channelLevel !== 'all')) {
                return false;
            }
        }
    } else if (effectiveLevel === General.MENTION && !wasMentioned) {
        return false;
    }

    switch (userNotifyProps.push_status || General.ONLINE) {
        case General.AWAY:
            return status === General.AWAY || status === General.OFFLINE;
        case General.OFFLINE:
            return status === General.OFFLINE;
        case General.ONLINE:
            return true;
        default:
            return false;
    }
}
