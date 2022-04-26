// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {schema} from './index';

const {INFO, GLOBAL, SERVERS} = MM_TABLES.APP;

describe('*** Test schema for APP database ***', () => {
    it('=> The APP SCHEMA should strictly match', () => {
        expect(schema).toEqual({
            version: 1,
            tables: {
                [INFO]: {
                    name: INFO,
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
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'value', type: 'string'},
                    ],
                },
                [SERVERS]: {
                    name: SERVERS,
                    columns: {
                        db_path: {name: 'db_path', type: 'string'},
                        display_name: {name: 'display_name', type: 'string'},
                        identifier: {name: 'identifier', type: 'string', isIndexed: true},
                        last_active_at: {name: 'last_active_at', type: 'number', isIndexed: true},
                        url: {name: 'url', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'db_path', type: 'string'},
                        {name: 'display_name', type: 'string'},
                        {name: 'identifier', type: 'string', isIndexed: true},
                        {name: 'last_active_at', type: 'number', isIndexed: true},
                        {name: 'url', type: 'string', isIndexed: true},
                    ],
                },
            },
        });
    });
});
