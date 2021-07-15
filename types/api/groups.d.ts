// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type SyncableType = 'team' | 'channel';
type SyncablePatch = {
    scheme_admin: boolean;
    auto_add: boolean;
};
type Group = {
    id: string;
    name: string;
    display_name: string;
    description: string;
    type: string;
    remote_id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    has_syncables: boolean;
    member_count: number;
    scheme_admin?: boolean;
    allow_reference: boolean;
};
type GroupTeam = {
    team_id: string;
    team_display_name: string;
    team_type: string;
    group_id: string;
    auto_add: boolean;
    scheme_admin?: boolean;
    create_at: number;
    delete_at: number;
    update_at: number;
};
type GroupChannel = {
    channel_id: string;
    channel_display_name: string;
    channel_type: string;
    team_id: string;
    team_display_name: string;
    team_type: string;
    group_id: string;
    auto_add: boolean;
    scheme_admin?: boolean;
    create_at: number;
    delete_at: number;
    update_at: number;
    member_count: number;
    timezone_count: number;
};
type GroupSyncables = {
    teams: GroupTeam[];
    channels: GroupChannel[];
};
type GroupsState = {
    syncables: {
        [x: string]: GroupSyncables;
    };
    members: any;
    groups: {
        [x: string]: Group;
    };
    myGroups: {
        [x: string]: Group;
    };
};
type GroupSearchOpts = {
    q: string;
    is_linked?: boolean;
    is_configured?: boolean;
};
