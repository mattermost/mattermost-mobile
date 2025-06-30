// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftsButton from './drafts_button';

import EnhancedDraftButton from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./drafts_button', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(DraftsButton).mockImplementation((props) => React.createElement('DraftsButton', {...props, testID: 'drafts-button'}));

describe('DraftsButton', () => {

    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [TestHelper.fakeTeam({id: teamId})], prepareRecordsOnly: false});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should correctly show isActiveTab if the last channel id Global_DRAFTS', async () => {
        await operator.handleTeamChannelHistory({
            teamChannelHistories: [
                {channel_ids: [Screens.GLOBAL_DRAFTS], id: teamId},
            ],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedDraftButton
                shouldHighlightActive={false}
                draftsCount={0}
                scheduledPostCount={0}
                scheduledPostHasError={false}
            />, {database});

        const draftsButton = getByTestId('drafts-button');
        expect(draftsButton.props.isActiveTab).toBe(true);
    });

    it('should correctly show isActiveTab if the last channel id is not Global_DRAFTS', async () => {
        await operator.handleTeamChannelHistory({
            teamChannelHistories: [
                {channel_ids: ['channel1'], id: teamId},
            ],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedDraftButton
                shouldHighlightActive={false}
                draftsCount={0}
                scheduledPostCount={0}
                scheduledPostHasError={false}
            />, {database});

        const draftsButton = getByTestId('drafts-button');
        expect(draftsButton.props.isActiveTab).toBe(false);
    });

    it('if shouldHightlightActive is true and no last channel id is present, then isActiveTab should be true', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedDraftButton
                shouldHighlightActive={true}
                draftsCount={0}
                scheduledPostCount={0}
                scheduledPostHasError={false}
            />, {database});

        const draftsButton = getByTestId('drafts-button');
        expect(draftsButton.props.isActiveTab).toBe(true);
    });
});
