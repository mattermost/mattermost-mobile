// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {serverSchema} from './index';

const {
    CUSTOM_EMOJI,
    MY_TEAM,
    ROLE,
    SLASH_COMMAND,
    SYSTEM,
    TERMS_OF_SERVICE,
    TEAM,
    TEAM_CHANNEL_HISTORY,
    TEAM_MEMBERSHIP,
    TEAM_SEARCH_HISTORY,
} = MM_TABLES.SERVER;

describe('*** Test schema for SERVER database ***', () => {
    it('=> The SERVER SCHEMA should strictly match', () => {
        expect(serverSchema).toEqual({
            version: 1,
            tables: {
                [CUSTOM_EMOJI]: {
                    name: CUSTOM_EMOJI,
                    columns: {
                        name: {name: 'name', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string'},
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
            },
        });
    });
});
