// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {serverSchema} from './index';

const {USER, REACTION, PREFERENCE, CHANNEL_MEMBERSHIP, CUSTOM_EMOJI, ROLE, SYSTEM, TERMS_OF_SERVICE} = MM_TABLES.SERVER;

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
                        category: {name: 'category', type: 'string'},
                        name: {name: 'name', type: 'string'},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'category', type: 'string'},
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
                        nick_name: {name: 'nick_name', type: 'string'},
                        notify_props: {name: 'notify_props', type: 'string'},
                        position: {name: 'position', type: 'string'},
                        props: {name: 'props', type: 'string'},
                        roles: {name: 'roles', type: 'string'},
                        status: {name: 'status', type: 'string'},
                        time_zone: {name: 'time_zone', type: 'string'},
                        user_id: {name: 'user_id', type: 'string'},
                        user_name: {name: 'user_name', type: 'string'},
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
                        {name: 'nick_name', type: 'string'},
                        {name: 'notify_props', type: 'string'},
                        {name: 'position', type: 'string'},
                        {name: 'props', type: 'string'},
                        {name: 'roles', type: 'string'},
                        {name: 'status', type: 'string'},
                        {name: 'time_zone', type: 'string'},
                        {name: 'user_id', type: 'string'},
                        {name: 'user_name', type: 'string'},
                    ],
                },
            },
        });
    });
});
