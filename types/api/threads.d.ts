// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type Thread = {
    id: string;
    reply_count: number;
    last_reply_at: number;
    last_viewed_at: number;
    participants: UserProfile[];
    post: Post;
    team_id: $ID<Team>;
    unread_replies: number;
    unread_mentions: number;
    is_following?: boolean;
};

type ThreadParticipant = {
    id: $ID<User>;
    thread_id: $ID<Thread>;
};
