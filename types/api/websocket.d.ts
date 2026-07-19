// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type WebsocketBroadcast = {
    omit_users: Dictionary<boolean>;
    user_id: string;
    channel_id: string;
    team_id: string;
}

type WebSocketMessage<T = any> = {
    event: string;
    data: T;
    broadcast: WebsocketBroadcast;
    seq: number;
}

// Wire shape of the `posted` event payload. Several fields arrive as
// JSON-encoded strings (post, mentions, followers) rather than parsed objects.
type PostedData = {
    post: string; // JSON-encoded Post — call JSON.parse(post) to get a Post
    channel_type?: ChannelType;
    channel_display_name?: string;
    channel_name?: string;
    sender_name?: string;
    team_id?: string;
    set_online?: boolean;
    mentions?: string; // JSON-encoded string[] of user IDs; per-recipient via broadcast hook
    followers?: string; // JSON-encoded string[] of user IDs; per-recipient via broadcast hook
    mute_for_recipient?: boolean; // per-recipient; true when this user has the channel muted
    timestamp?: number; // present only when the experience API is enabled
    otherFile?: string;
    image?: string;
    should_ack?: boolean;
};

type ThreadReadChangedData = {
    thread_id: string;
    timestamp: number;
    unread_mentions: number;
    unread_replies: number;
    previous_unread_mentions?: number;
    previous_unread_replies?: number;
    channel_id?: string;
    thread_team_id?: string;
};

type ChannelMemberUnreadsAndMentions = {
    mention_count: number;
    mention_count_root: number;
    is_unread: boolean;
    timestamp?: number; // present only when the experience API is enabled
};

type ChannelDeletedData = {
    channel_id: string;
    delete_at: number;
    team_id?: string;
    member_unreads_mentions?: ChannelMemberUnreadsAndMentions;
};

type UserRemovedData = {
    user_id?: string;
    channel_id?: string;
    remover_id?: string;
    team_id?: string;
    member_unreads_mentions?: ChannelMemberUnreadsAndMentions;
};

type PostTranslationUpdateData = {
    object_id: string;
    translations: Record<string, {
        state: 'ready' | 'skipped' | 'processing' | 'unavailable';
        translation: string; // JSON-encoded PostTranslation['object']
        translation_type?: string;
        src_lang?: string;
    }>;
}
