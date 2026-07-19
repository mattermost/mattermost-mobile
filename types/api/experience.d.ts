// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ExperienceUser = {
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

type ExperienceTeam = {
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
};

// ExperienceTeamMember extends TeamMembership with scheme_guest, which the
// experience endpoints include but the general TeamMembership type omits.
type ExperienceTeamMember = Pick<TeamMembership, 'team_id' | 'user_id' | 'roles' | 'delete_at' | 'scheme_user' | 'scheme_admin'> & {
    scheme_guest: boolean;
};

type ExperienceTeamMemberList = {
    members: ExperienceTeamMember[];
    removed_team_ids?: string[];
};

// team_id is absent when the counts refer to direct/group-message channels.
type ExperienceUnreads = {
    team_id?: string;
    mention_count: number;
    mention_count_root?: number;
    urgent_mention_count?: number;
    has_unreads: boolean;
    thread_mention_count?: number;
    thread_urgent_mention_count?: number;
    thread_has_unreads?: boolean;
};

type ExperienceGroupMembership = {
    group_id: string;
    user_id: string;
    create_at: number;
};

type ExperienceGroupMembershipList = {
    members: ExperienceGroupMembership[];
    removed_group_ids?: string[];
};

type PreferenceTombstone = {
    user_id: string;
    category: string;
    name: string;
    delete_at: number;
};

type ExperienceChannelMemberList = {
    members: ExperienceChannelMember[];
    removed_channel_ids?: string[];
};

type ExperienceChannel = {
    id: string;
    create_at?: number;
    update_at?: number;
    delete_at?: number;
    team_id: string;
    type: ChannelType;
    display_name: string;
    name: string;
    last_post_at: number;
    total_msg_count: number;
    creator_id?: string;
    group_constrained: boolean | null;
    shared: boolean | null;
    total_msg_count_root?: number;
    last_root_post_at?: number;
    policy_enforced?: boolean;

    // Populated only for GM channels — used for the member-count badge at cold start.
    member_count?: number;
};

type ExperienceChannelMember = {
    channel_id: string;
    user_id: string;
    roles: string;
    last_viewed_at: number;
    msg_count: number;
    mention_count: number;
    mention_count_root: number;
    notify_props: ChannelNotifyProps;
    urgent_mention_count: number;
    msg_count_root: number;
    last_update_at: number;
    scheme_guest: boolean;
    scheme_user: boolean;
    scheme_admin: boolean;
    autotranslation_disabled?: boolean;
};

// Only the fields needed for client-side permission evaluation.
type ExperienceRole = Pick<Role, 'id' | 'name' | 'create_at' | 'update_at' | 'delete_at' | 'permissions'>;

type InitialLoadResponse = {
    me: ExperienceUser | null;
    teams: ExperienceTeam[];
    team_members: ExperienceTeamMemberList;
    active_team: ExperienceActiveTeam | null;
    team_unreads?: ExperienceUnreads[];
    direct_unreads?: ExperienceUnreads;
    direct_profiles?: UserProfile[];
    roles: ExperienceRole[];
    preferences?: PreferenceType[];
    preference_tombstones?: PreferenceTombstone[];
    timestamp: number;
    can_join_other_teams: boolean;
    group_memberships?: ExperienceGroupMembershipList;
    statuses?: Record<string, UserStatus>;
};

type ExperienceActiveTeam = {
    team: ExperienceTeam;
    channels: ExperienceChannel[];
    channel_members: ExperienceChannelMemberList;
    sidebar_categories?: CategoriesWithOrder;
    sidebar_version: number;
};

type TeamLoadResponse = {
    channels: ExperienceChannel[];
    channel_members: ExperienceChannelMemberList;
    sidebar_categories?: CategoriesWithOrder;
    sidebar_version: number;
    roles?: ExperienceRole[];
    timestamp: number;
};

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
    team?: ExperienceTeam;
    memberships?: ExperienceTeamMember[];
    channels?: ExperienceChannel[];
    channel_members: ExperienceChannelMemberList;
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

type SyncResponse = {
    config?: Record<string, string>;
    license?: Record<string, string>;
    me?: ExperienceUser;
    removed_team_ids?: string[];
    teams_unreads?: ExperienceUnreads[];
    teams?: SyncTeamDelta[];
    direct_channels?: ExperienceChannel[];
    direct_channel_members?: ExperienceChannelMemberList;
    direct_unreads?: ExperienceUnreads;
    preferences?: PreferenceType[];
    preference_tombstones?: PreferenceTombstone[];
    group_memberships?: ExperienceGroupMembershipList;
    roles?: ExperienceRole[];
    posts?: Post[];
    authors?: UserProfile[];
    groups?: Group[];
    active_channel?: SyncActiveChannel;
    active_thread?: SyncActiveThread;
    threads_delta?: SyncThreadsDelta;
    statuses?: Record<string, UserStatus>;
    timestamp: number;
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
