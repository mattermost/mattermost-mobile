// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {defaultSchema} from './index';

const {APP, GLOBAL, SERVERS} = MM_TABLES.DEFAULT;

describe('*** Test schema for DEFAULT database ***', () => {
    it('=> The DEFAULT SCHEMA should strictly match', () => {
        expect(defaultSchema).toEqual({
            version: 1,
            tables: {
                [APP]: {
                    name: APP,
                    columns: {
                        build_number: {name: 'build_number', type: 'string'},
                        created_at: {name: 'created_at', type: 'number'},
                        version_number: {name: 'version_number', type: 'string'},
                    },
                    columnArray: [
                        {name: 'build_number', type: 'string'},
                        {name: 'created_at', type: 'number'},
                        {name: 'version_number', type: 'string'},
                    ],
                },
                [GLOBAL]: {
                    name: GLOBAL,
                    columns: {
                        name: {name: 'name', type: 'string', isIndexed: true},
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string', isIndexed: true},
                        {name: 'value', type: 'string'},
                    ],
                },
                [SERVERS]: {
                    name: SERVERS,
                    columns: {
                        db_path: {name: 'db_path', type: 'string'},
                        display_name: {name: 'display_name', type: 'string'},
                        mention_count: {name: 'mention_count', type: 'number'},
                        unread_count: {name: 'unread_count', type: 'number'},
                        url: {name: 'url', type: 'string', isIndexed: true},
                        last_active_at: {name: 'last_active_at', type: 'number', isIndexed: true},
                        is_secured: {name: 'is_secured', type: 'boolean'},
                    },
                    columnArray: [
                        {name: 'db_path', type: 'string'},
                        {name: 'display_name', type: 'string'},
                        {name: 'mention_count', type: 'number'},
                        {name: 'unread_count', type: 'number'},
                        {name: 'url', type: 'string', isIndexed: true},
                        {name: 'last_active_at', type: 'number', isIndexed: true},
                        {name: 'is_secured', type: 'boolean'},
                    ],
                },
            },
        });
    });
});
