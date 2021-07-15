// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type SlashCommand = {
    id: string;
    auto_complete: boolean;
    auto_complete_desc: string;
    auto_complete_hint: string;
    create_at: number;
    creator_id: string;
    delete_at: number;
    description: string;
    display_name: string;
    icon_url: string;
    method: string;
    team_id: string;
    token: string;
    trigger: string;
    update_at: number;
    url: string;
    username: string;
};
