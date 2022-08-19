// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type Thread = {
    id: string;
    reply_count: number;
    last_reply_at: number;
    last_viewed_at: number;
    participants: UserProfile[];
    post: Post;
    is_following?: boolean;
    unread_replies: number;
    unread_mentions: number;
    delete_at: number;
};

type ThreadWithLastFetchedAt = Thread & {
    lastFetchedAt: number;
}

type ThreadWithViewedAt = Thread & {
    viewed_at: number;
};

type ThreadParticipant = {
    id: $ID<UserProfile>;
    thread_id: $ID<Thread>;
};

type GetUserThreadsResponse = {
    threads: Thread[];
    total: number;
    total_unread_mentions: number;
    total_unread_threads: number;
};
