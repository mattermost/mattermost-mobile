// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {serverSchema} from './index';

const {
    CUSTOM_EMOJI,
    GROUP,
    GROUPS_IN_CHANNEL,
    GROUPS_IN_TEAM,
    GROUP_MEMBERSHIP,
    ROLE,
    SYSTEM,
    TERMS_OF_SERVICE,
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
                [GROUP]: {
                    name: GROUP,
                    columns: {
                        display_name: {name: 'display_name', type: 'string'},
                        name: {name: 'name', type: 'string'},
                    },
                    columnArray: [
                        {name: 'display_name', type: 'string'},
                        {name: 'name', type: 'string'},
                    ],
                },
                [GROUPS_IN_CHANNEL]: {
                    name: GROUPS_IN_CHANNEL,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        group_id: {name: 'group_id', type: 'string', isIndexed: true},
                        member_count: {name: 'member_count', type: 'number'},
                        timezone_count: {name: 'timezone_count', type: 'number'},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'group_id', type: 'string', isIndexed: true},
                        {name: 'member_count', type: 'number'},
                        {name: 'timezone_count', type: 'number'},
                    ],
                },
                [GROUPS_IN_TEAM]: {
                    name: GROUPS_IN_TEAM,
                    columns: {
                        group_id: {name: 'group_id', type: 'string', isIndexed: true},
                        member_count: {name: 'member_count', type: 'number'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        timezone_count: {name: 'timezone_count', type: 'number'},
                    },
                    columnArray: [
                        {name: 'group_id', type: 'string', isIndexed: true},
                        {name: 'member_count', type: 'number'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'timezone_count', type: 'number'},
                    ],
                },
                [GROUP_MEMBERSHIP]: {
                    name: GROUP_MEMBERSHIP,
                    columns: {
                        group_id: {name: 'group_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'group_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
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
