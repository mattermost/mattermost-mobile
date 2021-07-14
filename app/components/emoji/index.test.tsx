// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@init/network_manager';
import {Database} from '@nozbe/watermelondb';
import React from 'react';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithDatabase} from '@test/intl-test-helper';
import {MOCKED_DATA} from '@test/mock_database_data';

import Emoji from './index';

import type ServerDataOperator from '@app/database/operator/server_data_operator';

describe('Emoji Component Test', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeAll(async () => {
        const serverUrl = 'baseHandler.test.com';
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.serverDatabases[serverUrl].database;
        operator = DatabaseManager.serverDatabases[serverUrl].operator;

        await NetworkManager.init([{serverUrl, userId: '1234567', token: '432424788^^83434'}]);

        await operator.handleSystem({
            systems: [
                {
                    id: SYSTEM_IDENTIFIERS.CONFIG,
                    value: MOCKED_DATA.CONFIG,
                },
                {
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: '1234567',
                },
            ],
            prepareRecordsOnly: false,
        });
    });

    it('should match snapshot', () => {
        const {toJSON} = renderWithDatabase(
            <Emoji
                size={24}
                emojiName={'smiley'}
            />,
            database,
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
