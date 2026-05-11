// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// InitialLoad response types — mirrors server/public/model/initial_load.go

type InitialLoadUser = {
    id: string;
    create_at?: number;
    update_at?: number;
    delete_at: number;
    username: string;
    auth_service: string;
    email: string;
    nickname: string;
    first_name: string;
    last_name: string;
    position: string;
    roles: string;
    props?: UserProps;
    notify_props?: UserNotifyProps;
    last_picture_update?: number;
    locale: string;
    timezone: UserTimezone;
    terms_of_service_id?: string;
    terms_of_service_create_at?: number;
};

type InitialLoadTeam = {
    id: string;
    create_at?: number;
    update_at?: number;
    delete_at?: number;
    display_name: string;
    name: string;
    type: string;
    invite_id?: string;
    group_constrained: boolean | null;
    last_team_icon_update?: number;
    mention_count: number;
    mention_count_root?: number;
    urgent_mention_count?: number;
    has_unreads: boolean;
    thread_mention_count?: number;
    thread_urgent_mention_count?: number;
    thread_has_unreads?: boolean;
};

type InitialLoadTeamMember = {
    team_id: string;
    user_id: string;
    roles: string;
    delete_at: number;
    scheme_guest: boolean;
    scheme_user: boolean;
    scheme_admin: boolean;
};

type InitialLoadTeamMemberList = {
    members: InitialLoadTeamMember[];
    removed_team_ids?: string[];
};

// Channel/member/role types are defined in channel_load.d.ts (shared with team_load).

type InitialLoadActiveTeam = {
    team: InitialLoadTeam;
    channels: ChannelLoadItem[];
    channel_members: ChannelMemberLoadList;
    sidebar_categories?: CategoriesWithOrder;
    sidebar_version: number;
};

type InitialLoadDirectCounts = {
    mention_count: number;
    mention_count_root?: number;
    urgent_mention_count?: number;
    has_unreads: boolean;
    thread_mention_count?: number;
    thread_urgent_mention_count?: number;
    thread_has_unreads?: boolean;
};

type InitialLoadPriorityHints = {
    active_team_id: string;
    active_channel_id?: string;
    urgent_channels?: string[];
    stale_channels?: string[];
};

type TeamBadge = {
    mentionCount: number;
    hasUnreads: boolean;
    threadMentionCount: number;
    threadHasUnreads: boolean;
};

type TeamBadgeCounts = {
    teams: Record<string, TeamBadge>;
    direct: TeamBadge;
};

type InitialLoadResponse = {
    me: InitialLoadUser | null;
    teams: InitialLoadTeam[];
    team_members: InitialLoadTeamMemberList;
    active_team: InitialLoadActiveTeam | null;
    direct_channel_counts?: InitialLoadDirectCounts;
    direct_profiles?: UserProfile[];
    roles: RoleLoadItem[];
    preferences?: PreferenceType[];
    preference_tombstones?: Array<{user_id: string; category: string; name: string; delete_at: number}>;
    timestamp: number;
    priority_hints?: InitialLoadPriorityHints;
    can_join_other_teams: boolean;
};
