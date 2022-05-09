// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
    create_at: number;
    delete_at: number;
    update_at: number;
}

type GroupMember = {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    username: string;
    first_name: string;
    last_name: string;
    nickname: string;
    email: string;
    email_verified: boolean;
    auth_service: string;
    roles: string;
    locale: string;
    notify_props: {
        email: boolean;
        push: string;
        desktop: string;
        desktop_sound: rue;
        mention_keys: string;
        channel: rue;
        first_name: rue;
    };
    props: {};
    last_password_update: number;
    last_picture_update: number;
    failed_attempts: number;
    mfa_active: boolean;
    timezone: {
        useAutomaticTimezone: boolean;
        manualTimezone: string;
        automaticTimezone: string;
    };
    terms_of_service_id: string;
    terms_of_service_create_at: number;
}

type GroupMembership = GroupMember[] & {
    total_number_count: number;
}
