// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {serverSchema} from './index';

const {
    CHANNEL_MEMBERSHIP,
    CUSTOM_EMOJI,
    MY_TEAM,
    PREFERENCE,
    REACTION,
    ROLE,
    SLASH_COMMAND,
    SYSTEM,
    TEAM,
    TEAM_CHANNEL_HISTORY,
    TEAM_MEMBERSHIP,
    TEAM_SEARCH_HISTORY,
    TERMS_OF_SERVICE,
    USER,
} = MM_TABLES.SERVER;

describe('*** Test schema for SERVER database ***', () => {
    it('=> The SERVER SCHEMA should strictly match', () => {
        expect(serverSchema).toEqual({
            version: 1,
            tables: {
                [CHANNEL_MEMBERSHIP]: {
                    name: CHANNEL_MEMBERSHIP,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
                    ],
                },
                [CUSTOM_EMOJI]: {
                    name: CUSTOM_EMOJI,
                    columns: {
                        name: {name: 'name', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string'},
                    ],
                },
                [PREFERENCE]: {
                    name: PREFERENCE,
                    columns: {
                        category: {name: 'category', type: 'string', isIndexed: true},
                        name: {name: 'name', type: 'string'},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'category', type: 'string', isIndexed: true},
                        {name: 'name', type: 'string'},
                        {name: 'user_id', type: 'string', isIndexed: true},
                        {name: 'value', type: 'string'},
                    ],
                },
                [REACTION]: {
                    name: REACTION,
                    columns: {
                        create_at: {name: 'create_at', type: 'number'},
                        emoji_name: {name: 'emoji_name', type: 'string'},
                        post_id: {name: 'post_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'create_at', type: 'number'},
                        {name: 'emoji_name', type: 'string'},
                        {name: 'post_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
                    ],
                },
                [MY_TEAM]: {
                    name: MY_TEAM,
                    columns: {
                        is_unread: {name: 'is_unread', type: 'boolean'},
                        mentions_count: {name: 'mentions_count', type: 'number'},
                        roles: {name: 'roles', type: 'string'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'is_unread', type: 'boolean'},
                        {name: 'mentions_count', type: 'number'},
                        {name: 'roles', type: 'string'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                    ],
                },
                [ROLE]: {
                    name: ROLE,
                    columns: {
                        name: {name: 'name', type: 'string'},
                        permissions: {name: 'permissions', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string'},
                        {name: 'permissions', type: 'string'},
                    ],
                },
                [SLASH_COMMAND]: {
                    name: SLASH_COMMAND,
                    columns: {
                        is_auto_complete: {name: 'is_auto_complete', type: 'boolean'},
                        description: {name: 'description', type: 'string'},
                        display_name: {name: 'display_name', type: 'string'},
                        hint: {name: 'hint', type: 'string'},
                        method: {name: 'method', type: 'string'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        token: {name: 'token', type: 'string'},
                        trigger: {name: 'trigger', type: 'string'},
                    },
                    columnArray: [
                        {name: 'is_auto_complete', type: 'boolean'},
                        {name: 'description', type: 'string'},
                        {name: 'display_name', type: 'string'},
                        {name: 'hint', type: 'string'},
                        {name: 'method', type: 'string'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'token', type: 'string'},
                        {name: 'trigger', type: 'string'},
                    ],
                },
                [SYSTEM]: {
                    name: SYSTEM,
                    columns: {
                        name: {name: 'name', type: 'string'},
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string'},
                        {name: 'value', type: 'string'},
                    ],
                },
                [TEAM]: {
                    name: TEAM,
                    columns: {
                        is_allow_open_invite: {name: 'is_allow_open_invite', type: 'boolean'},
                        allowed_domains: {name: 'allowed_domains', type: 'string'},
                        description: {name: 'description', type: 'string'},
                        display_name: {name: 'display_name', type: 'string'},
                        is_group_constrained: {name: 'is_group_constrained', type: 'boolean'},
                        last_team_icon_updated_at: {name: 'last_team_icon_updated_at', type: 'number'},
                        name: {name: 'name', type: 'string'},
                        type: {name: 'type', type: 'string'},
                    },
                    columnArray: [
                        {name: 'is_allow_open_invite', type: 'boolean'},
                        {name: 'allowed_domains', type: 'string'},
                        {name: 'description', type: 'string'},
                        {name: 'display_name', type: 'string'},
                        {name: 'is_group_constrained', type: 'boolean'},
                        {name: 'last_team_icon_updated_at', type: 'number'},
                        {name: 'name', type: 'string'},
                        {name: 'type', type: 'string'},
                    ],
                },
                [TEAM_CHANNEL_HISTORY]: {
                    name: TEAM_CHANNEL_HISTORY,
                    columns: {
                        channel_ids: {name: 'channel_ids', type: 'string'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'channel_ids', type: 'string'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                    ],
                },
                [TEAM_MEMBERSHIP]: {
                    name: TEAM_MEMBERSHIP,
                    columns: {
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
                    ],
                },
                [TEAM_SEARCH_HISTORY]: {
                    name: TEAM_SEARCH_HISTORY,
                    columns: {
                        created_at: {name: 'created_at', type: 'number'},
                        display_term: {name: 'display_term', type: 'string'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        term: {name: 'term', type: 'string'},

                    },
                    columnArray: [
                        {name: 'created_at', type: 'number'},
                        {name: 'display_term', type: 'string'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'term', type: 'string'},
                    ],
                },
                [TERMS_OF_SERVICE]: {
                    name: TERMS_OF_SERVICE,
                    columns: {
                        accepted_at: {name: 'accepted_at', type: 'number'},
                    },
                    columnArray: [
                        {name: 'accepted_at', type: 'number'},
                    ],
                },
                [USER]: {
                    name: USER,
                    columns: {
                        auth_service: {name: 'auth_service', type: 'string'},
                        delete_at: {name: 'delete_at', type: 'number'},
                        email: {name: 'email', type: 'string'},
                        first_name: {name: 'first_name', type: 'string'},
                        is_bot: {name: 'is_bot', type: 'boolean'},
                        is_guest: {name: 'is_guest', type: 'boolean'},
                        last_name: {name: 'last_name', type: 'string'},
                        last_picture_update: {name: 'last_picture_update', type: 'number'},
                        locale: {name: 'locale', type: 'string'},
                        nickname: {name: 'nickname', type: 'string'},
                        notify_props: {name: 'notify_props', type: 'string'},
                        position: {name: 'position', type: 'string'},
                        props: {name: 'props', type: 'string'},
                        roles: {name: 'roles', type: 'string'},
                        status: {name: 'status', type: 'string'},
                        timezone: {name: 'timezone', type: 'string'},
                        user_id: {name: 'user_id', type: 'string'},
                        username: {name: 'username', type: 'string'},
                    },
                    columnArray: [
                        {name: 'auth_service', type: 'string'},
                        {name: 'delete_at', type: 'number'},
                        {name: 'email', type: 'string'},
                        {name: 'first_name', type: 'string'},
                        {name: 'is_bot', type: 'boolean'},
                        {name: 'is_guest', type: 'boolean'},
                        {name: 'last_name', type: 'string'},
                        {name: 'last_picture_update', type: 'number'},
                        {name: 'locale', type: 'string'},
                        {name: 'nickname', type: 'string'},
                        {name: 'notify_props', type: 'string'},
                        {name: 'position', type: 'string'},
                        {name: 'props', type: 'string'},
                        {name: 'roles', type: 'string'},
                        {name: 'status', type: 'string'},
                        {name: 'timezone', type: 'string'},
                        {name: 'user_id', type: 'string'},
                        {name: 'username', type: 'string'},
                    ],
                },
            },
        });
    });
});
