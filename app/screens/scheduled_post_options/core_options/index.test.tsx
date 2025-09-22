// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager/__mocks__';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {getTimezone} from '@utils/user';

import {ScheduledPostCoreOptions} from './core_options';

import EnhancedScheduledPostCoreOptions from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./core_options', () => ({
    __esModule: true,
    ScheduledPostCoreOptions: jest.fn(),
}));

jest.mocked(ScheduledPostCoreOptions).mockImplementation((props) => React.createElement('ScheduledPostCoreOptions', {...props, testID: 'scheduled-post-core-options'}));

describe('EnhancedScheduledPostCoreOptions', () => {
    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleUsers({users: [TestHelper.fakeUser({id: 'user1', timezone: {useAutomaticTimezone: false, manualTimezone: 'America/New_York', automaticTimezone: 'America/New_York'}})], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user1'}], prepareRecordsOnly: false});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should correctly return the isMilitaryTime preference', async () => {
        await operator.handlePreferences({
            preferences: [{
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: 'use_military_time',
                user_id: 'user1',
                value: 'true',
            }],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedScheduledPostCoreOptions
                userTimezone={getTimezone({
                    useAutomaticTimezone: false,
                    manualTimezone: 'America/New_York',
                    automaticTimezone: 'America/New_York',
                })}
                onSelectOption={jest.fn()}
                onCustomTimeSelected={jest.fn()}
            />,
            {database},
        );

        expect(getByTestId('scheduled-post-core-options')).toBeTruthy();
        expect(getByTestId('scheduled-post-core-options').props.isMilitaryTime).toBe(true);
    });

    it('should return false if the isMilitaryTime preference is not set', async () => {
        await operator.handlePreferences({
            preferences: [],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedScheduledPostCoreOptions
                userTimezone={getTimezone({
                    useAutomaticTimezone: false,
                    manualTimezone: 'America/New_York',
                    automaticTimezone: 'America/New_York',
                })}
                onSelectOption={jest.fn()}
                onCustomTimeSelected={jest.fn()}
            />,
            {database},
        );

        expect(getByTestId('scheduled-post-core-options')).toBeTruthy();
        expect(getByTestId('scheduled-post-core-options').props.isMilitaryTime).toBe(false);
    });
});
