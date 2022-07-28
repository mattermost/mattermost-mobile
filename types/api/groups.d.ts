// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type Group = {
    id: string;
    name: string;
    display_name: string;
    description: string;
    source: string;
    remote_id: string;
    member_count?: number;
    allow_reference: boolean;
    create_at: number;
    update_at: number;
    delete_at: number;
};

type GroupTeam = {
    id?: string;
    team_id: string;
    group_id: string;
}

type GroupChannel = {
    id?: string;
    channel_id: string;
    group_id: string;
}

type GroupMembership = {
    id?: string;
    group_id: string;
    user_id: string;
}
