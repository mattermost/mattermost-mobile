// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager/__mocks__';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RescheduledDraft from './reschedule_draft';

import EnhancedRescheduledDraft from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./reschedule_draft', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(RescheduledDraft).mockImplementation((props) => React.createElement('RescheduledDraft', {...props, testID: 'reschedule-draft'}));

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
            <EnhancedRescheduledDraft
                componentId={Screens.RESCHEDULE_DRAFT}
                closeButtonId={'close-button'}
                draft={TestHelper.fakeScheduledPostModel({id: 'draft1'})}
            />,
            {database},
        );

        expect(getByTestId('reschedule-draft')).toBeTruthy();
        expect(getByTestId('reschedule-draft').props.currentUserTimezone).toStrictEqual({
            useAutomaticTimezone: false,
            manualTimezone: 'America/New_York',
            automaticTimezone: 'America/New_York',
        });
    });

    it('should return undefined if the current user timezone is not set', async () => {
        await operator.handleUsers({users: [TestHelper.fakeUser({id: 'user1', timezone: undefined})], prepareRecordsOnly: false});

        const {getByTestId} = renderWithEverything(
            <EnhancedRescheduledDraft
                componentId={Screens.RESCHEDULE_DRAFT}
                closeButtonId={'close-button'}
                draft={TestHelper.fakeScheduledPostModel({id: 'draft1'})}
            />,
            {database},
        );

        expect(getByTestId('reschedule-draft')).toBeTruthy();
        expect(getByTestId('reschedule-draft').props.currentUserTimezone).toBeUndefined();
    });
});
