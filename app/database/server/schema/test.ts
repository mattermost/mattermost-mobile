// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {serverSchema} from './index';

const {CHANNEL, CHANNEL_INFO, CUSTOM_EMOJI, MY_CHANNEL, MY_CHANNEL_SETTINGS, POSTS_IN_CHANNEL, ROLE, SYSTEM, TERMS_OF_SERVICE} = MM_TABLES.SERVER;

describe('*** Test schema for SERVER database ***', () => {
    it('=> The SERVER SCHEMA should strictly match', () => {
        expect(serverSchema).toEqual({
            version: 1,
            tables: {
                [CHANNEL_INFO]: {
                    name: CHANNEL_INFO,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        guest_count: {name: 'guest_count', type: 'number'},
                        header: {name: 'header', type: 'string'},
                        member_count: {name: 'member_count', type: 'number'},
                        pin_post_count: {name: 'pin_post_count', type: 'number'},
                        purpose: {name: 'purpose', type: 'string'},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'guest_count', type: 'number'},
                        {name: 'header', type: 'string'},
                        {name: 'member_count', type: 'number'},
                        {name: 'pin_post_count', type: 'number'},
                        {name: 'purpose', type: 'string'},
                    ],
                },
                [CHANNEL]: {
                    name: CHANNEL,
                    columns: {
                        create_at: {name: 'create_at', type: 'number'},
                        creator_id: {name: 'creator_id', type: 'string', isIndexed: true},
                        delete_at: {name: 'delete_at', type: 'number'},
                        display_name: {name: 'display_name', type: 'string'},
                        is_group_constrained: {name: 'is_group_constrained', type: 'boolean'},
                        name: {name: 'name', type: 'string'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        type: {name: 'type', type: 'string'},
                    },
                    columnArray: [
                        {name: 'create_at', type: 'number'},
                        {name: 'creator_id', type: 'string', isIndexed: true},
                        {name: 'delete_at', type: 'number'},
                        {name: 'display_name', type: 'string'},
                        {name: 'is_group_constrained', type: 'boolean'},
                        {name: 'name', type: 'string'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'type', type: 'string'},
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
                [MY_CHANNEL]: {
                    name: MY_CHANNEL,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        last_post_at: {name: 'last_post_at', type: 'number'},
                        last_viewed_at: {name: 'last_viewed_at', type: 'number'},
                        mentions_count: {name: 'mentions_count', type: 'number'},
                        message_count: {name: 'message_count', type: 'number'},
                        roles: {name: 'roles', type: 'string'},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'last_post_at', type: 'number'},
                        {name: 'last_viewed_at', type: 'number'},
                        {name: 'mentions_count', type: 'number'},
                        {name: 'message_count', type: 'number'},
                        {name: 'roles', type: 'string'},
                    ],
                },
                [MY_CHANNEL_SETTINGS]: {
                    name: MY_CHANNEL_SETTINGS,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        notify_props: {name: 'notify_props', type: 'string'},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'notify_props', type: 'string'},
                    ],
                },
                [POSTS_IN_CHANNEL]: {
                    name: POSTS_IN_CHANNEL,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        earliest: {name: 'earliest', type: 'number'},
                        latest: {name: 'latest', type: 'number'},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'earliest', type: 'number'},
                        {name: 'latest', type: 'number'},
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
