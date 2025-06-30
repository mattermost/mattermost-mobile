// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {storeGlobal} from '@actions/app/global';
import {Tutorial} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';

import SendButton from './send_button';

import EnhancedSendButton from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./send_button', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(SendButton).mockImplementation((props) => React.createElement('SendButton', {...props, testID: 'send-button'}));

describe('SendButton', () => {
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
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        await storeGlobal(Tutorial.SCHEDULED_POST, null, false);
    });

    const defaultProps: Parameters<typeof EnhancedSendButton>[0] = {
        testID: 'send-button',
        disabled: false,
        sendMessage: jest.fn(),
        showScheduledPostOptions: jest.fn(),
        scheduledPostEnabled: true,
    };

    it('should return false if the scheduled post tutorial is not watched', async () => {
        const {getByTestId} = renderWithEverything(<EnhancedSendButton {...defaultProps}/>, {database});
        const sendButton = getByTestId('send-button');
        expect(sendButton.props.scheduledPostFeatureTooltipWatched).toBe(false);
    });

    it('should return true if the scheduled post tutorial is watched', async () => {
        await storeGlobal(Tutorial.SCHEDULED_POST, 'true', false);
        await waitFor(() => {
            const {getByTestId} = renderWithEverything(<EnhancedSendButton {...defaultProps}/>, {database});
            const sendButton = getByTestId('send-button');
            expect(sendButton.props.scheduledPostFeatureTooltipWatched).toBe(true);
        });
    });
});
