// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type Group = {
    id: string;
    name: string;
    display_name: string;
    description: string;
    source: string;
    remote_id: string;
    member_count: number;
    allow_reference: boolean;
    create_at: number;
    update_at: number;
    delete_at: number;
};

type GroupTeam = {
    team_id: string;
    team_display_name: string;
    team_type: string;
    group_id: string;
    auto_add: boolean;
    create_at: number;
    delete_at: number;
    update_at: number;
}

type GroupChannel = {
    channel_id: string;
    channel_display_name: string;
    channel_type: string;
    team_id: string;
    team_display_name: string;
    team_type: string;
    group_id: string;
    auto_add: boolean;
    member_count?: number;
    timezone_count?: number;
    create_at: number;
    delete_at: number;
    update_at: number;
}

type GroupMembership = UserProfile[]
