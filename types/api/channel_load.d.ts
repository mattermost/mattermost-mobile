// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Shared compact types for channel/member data returned by the experience API
// endpoints (/initial_load and /teams/{id}/load).
// Mirrors server/public/model/channel_load.go

type ChannelLoadItem = {
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

type ChannelMemberLoadItem = {
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

type ChannelMemberLoadList = {
    members: ChannelMemberLoadItem[];
    removed_channel_ids?: string[];
};

type RoleLoadItem = {
    id: string;
    name: string;
    create_at?: number;
    update_at?: number;
    delete_at?: number;
    permissions: string[];
};
