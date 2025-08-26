// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager/__mocks__';
import {ScheduledPostOptions} from '@screens/scheduled_post_options/scheduled_post_picker';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EnhancedScheduledPostPicker from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./scheduled_post_picker', () => ({
    __esModule: true,
    ScheduledPostOptions: jest.fn(),
}));

jest.mocked(ScheduledPostOptions).mockImplementation((props) => React.createElement('ScheduledPostOptions', {...props, testID: 'scheduled-post-options'}));

describe('EnhancedRescheduledDraft', () => {

    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user1'}], prepareRecordsOnly: false});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should correctly return the current user timezone', async () => {
        await operator.handleUsers({users: [TestHelper.fakeUser({id: 'user1', timezone: {useAutomaticTimezone: false, manualTimezone: 'America/New_York', automaticTimezone: 'America/New_York'}})], prepareRecordsOnly: false});

        const {getByTestId} = renderWithEverything(
            <EnhancedScheduledPostPicker
                onSchedule={jest.fn()}
            />,
            {database},
        );

        expect(getByTestId('scheduled-post-options')).toBeTruthy();
        expect(getByTestId('scheduled-post-options').props.currentUserTimezone).toStrictEqual({
            useAutomaticTimezone: false,
            manualTimezone: 'America/New_York',
            automaticTimezone: 'America/New_York',
        });
    });

    it('should return undefined if the current user timezone is not set', async () => {
        await operator.handleUsers({users: [TestHelper.fakeUser({id: 'user1', timezone: undefined})], prepareRecordsOnly: false});

        const {getByTestId} = renderWithEverything(
            <EnhancedScheduledPostPicker
                onSchedule={jest.fn()}
            />,
            {database},
        );

        expect(getByTestId('scheduled-post-options')).toBeTruthy();
        expect(getByTestId('scheduled-post-options').props.currentUserTimezone).toBeUndefined();
    });
});
