// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
type ChannelType = 'O' | 'P' | 'D' | 'G';
type ChannelStats = {
    channel_id: string;
    guest_count: number;
    member_count: number;
    pinnedpost_count: number;
    files_count: number;
};

type NotificationLevel = 'default' | 'all' | 'mention' | 'none';

type ChannelNotifyProps = {
    desktop: NotificationLevel;
    email: NotificationLevel;
    mark_unread: 'all' | 'mention';
    push: NotificationLevel;
    ignore_channel_mentions: 'default' | 'off' | 'on';
    channel_auto_follow_threads: 'on' | 'off';
    push_threads: 'all' | 'mention';
};
type Channel = {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    team_id: string;
    type: ChannelType;
    display_name: string;
    name: string;
    header: string;
    purpose: string;
    last_post_at: number;
    last_root_post_at?: number;
    total_msg_count: number;
    total_msg_count_root?: number;
    extra_update_at: number;
    creator_id: string;
    scheme_id: string|null;
    isCurrent?: boolean;
    teammate_id?: string;
    status?: string;
    fake?: boolean;
    group_constrained: boolean|null;
    shared: boolean;
    banner_info?: ChannelBannerInfo;

    /** Whether the channel has Attribute-Based Access Control (ABAC) policy enforcement enabled, controlling access based on user attributes */
    policy_enforced?: boolean;
};
type ChannelPatch = {
    name?: string;
    display_name?: string;
    header?: string;
    purpose?: string;
    group_constrained?: boolean|null;
};
type ChannelWithTeamData = Channel & {
    team_display_name: string;
    team_name: string;
    team_update_at: number;
}
type ChannelMember = {
    id?: string;
    channel_id: string;
    user_id: string;
    scheme_admin?: boolean;
}
type ChannelMembership = {
    id?: string;
    channel_id: string;
    user_id: string;
    roles: string;
    last_viewed_at: number;
    msg_count: number;
    msg_count_root?: number;
    mention_count: number;
    mention_count_root?: number;
    notify_props: Partial<ChannelNotifyProps>;
    last_post_at?: number;
    last_root_post_at?: number;
    last_update_at: number;
    scheme_user?: boolean;
    scheme_admin?: boolean;
    post_root_id?: string;
    is_unread?: boolean;
    manually_unread?: boolean;
};
type ChannelUnread = {
    channel_id: string;
    user_id: string;
    team_id: string;
    msg_count: number;
    mention_count: number;
    last_viewed_at: number;
    deltaMsgs: number;
};
type ChannelsState = {
    currentChannelId: string;
    channels: IDMappedObjects<Channel>;
    channelsInTeam: RelationOneToMany<Team, Channel>;
    myMembers: RelationOneToOne<Channel, ChannelMembership>;
    membersInChannel: RelationOneToOne<Channel, UserIDMappedObjects<ChannelMembership>>;
    stats: RelationOneToOne<Channel, ChannelStats>;
    groupsAssociatedToChannel: any;
    totalCount: number;
    manuallyUnread: RelationOneToOne<Channel, boolean>;
    channelMemberCountsByGroup: RelationOneToOne<Channel, ChannelMemberCountsByGroup>;
};

type ChannelModeration = {
    name: string;
    roles: {
        guests?: {
            value: boolean;
            enabled: boolean;
        };
        members: {
            value: boolean;
            enabled: boolean;
        };
    };
};

type ChannelModerationPatch = {
    name: string;
    roles: {
        guests?: boolean;
        members?: boolean;
    };
};

type ChannelMemberCountByGroup = {
    group_id: string;
    channel_member_count: number;
    channel_member_timezones_count: number;
};

type ChannelMemberCountsByGroup = Record<string, ChannelMemberCountByGroup>;

type ChannelBookmarkType = 'link' | 'file';

type ChannelBookmark = {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    channel_id: string;
    owner_id: string;
    file_id?: string;
    display_name: string;
    sort_order: number;
    link_url?: string;
    image_url?: string;
    emoji?: string;
    type: ChannelBookmarkType;
    original_id?: string;
    parent_id?: string;
}

type ChannelBookmarkWithFileInfo = ChannelBookmark & {
    file?: FileInfo;
}

type UpdateChannelBookmarkResponse = {
    updated: ChannelBookmarkWithFileInfo;
    deleted?: ChannelBookmarkWithFileInfo;
}

type ChannelBannerInfo = {
    enabled?: boolean;
    text?: string;
    background_color?: string;
}

type ChannelAccessControlAttributes = Record<string, string[]>;
