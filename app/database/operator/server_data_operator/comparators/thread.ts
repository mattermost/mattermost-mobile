// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ThreadModel from '@typings/database/models/servers/thread';

export const shouldUpdateThreadRecord = (e: ThreadModel, n: ThreadWithLastFetchedAt): boolean => {
    return (
        ((n.last_reply_at != null) && n.last_reply_at !== e.lastReplyAt) ||
        ((n.lastFetchedAt || 0) > e.lastFetchedAt) ||
        ((n.last_viewed_at != null) && e.lastViewedAt !== n.last_viewed_at) ||
        (e.replyCount !== n.reply_count) ||
        ((n.is_following != null) && e.isFollowing !== n.is_following) ||
        ((n.unread_replies != null) && e.unreadReplies !== n.unread_replies) ||
        ((n.unread_mentions != null) && e.unreadMentions !== n.unread_mentions)
    );
};
