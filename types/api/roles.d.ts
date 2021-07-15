// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ChannelModerationRoles = 'members' | 'guests';

type Role = {
    id: string;
    name: string;
    display_name?: string;
    description?: string;
    create_at?: number;
    update_at?: number;
    delete_at?: number;
    permissions: string[];
    scheme_managed?: boolean;
    built_in?: boolean;
};
