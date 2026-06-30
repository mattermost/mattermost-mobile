// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type SyncScope = {
    team_ids: string[];
    active_channel_id?: string;
    active_thread_id?: string;
    global_threads_team_id?: string;
};

type SyncRequest = {
    since: number;
    scope: SyncScope;
};

type SyncTeamDelta = {
    team_id: string;
    team?: InitialLoadTeam;
    memberships?: InitialLoadTeamMember[];
    channels?: ChannelLoadItem[];
    channel_members: ChannelMemberLoadList;
};

type SyncActiveChannel = {
    channel_id: string;
    posts_order?: string[];
    stats?: ChannelStats;
    bookmarks?: ChannelBookmark[];
    constrained_groups?: GroupWithSchemeAdmin[];
};

type SyncActiveThread = {
    root_id: string;
    posts_order?: string[];
};

type SyncThread = {
    id: string;
    reply_count: number;
    last_reply_at: number;
    last_viewed_at: number;
    unread_replies: number;
    unread_mentions: number;
    is_following: boolean;
    delete_at?: number;
};

type SyncThreadsDelta = {
    team_id: string;
    threads?: SyncThread[];
    total: number;
    total_unread_mentions: number;
    total_unread_threads: number;
};

type SyncTeamUnread = {
    team_id: string;
    mention_count: number;
    mention_count_root?: number;
    urgent_mention_count?: number;
    has_unreads: boolean;
    thread_mention_count?: number;
    thread_urgent_mention_count?: number;
    thread_has_unreads?: boolean;
};

type SyncResponse = {
    config?: Record<string, string>;
    license?: Record<string, string>;

    me?: UserProfile;
    removed_team_ids?: string[];

    teams_unreads?: SyncTeamUnread[];
    teams?: SyncTeamDelta[];
    direct_channels?: ChannelLoadItem[];
    direct_channel_members?: ChannelMemberLoadList;
    direct_channel_counts?: InitialLoadDirectCounts;
    preferences?: PreferenceType[];
    preference_tombstones?: PreferenceTombstone[];
    group_memberships?: InitialLoadGroupMembershipList;
    roles?: RoleLoadItem[];

    posts?: Post[];
    authors?: UserProfile[];
    groups?: Group[];

    active_channel?: SyncActiveChannel;
    active_thread?: SyncActiveThread;
    threads_delta?: SyncThreadsDelta;

    timestamp: number;
};
