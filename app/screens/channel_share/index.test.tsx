// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelShare from './channel_share';

import EnhancedChannelShare from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./channel_share', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ChannelShare).mockImplementation(
    (props) => React.createElement(View, {testID: 'channel_share', ...props}),
);

describe('ChannelShare index (enhanced)', () => {
    const serverUrl = 'https://server.test';
    const channelId = 'channel1';

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    it('renders ChannelShare with empty displayName when channel does not exist', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedChannelShare channelId={channelId}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('channel_share');
            expect(component).toBeTruthy();
        });

        const component = getByTestId('channel_share');
        expect(component).toHaveProp('channelId', channelId);
        expect(component).toHaveProp('displayName', '');
    });

    it('passes displayName from channel when channel exists', async () => {
        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({
                id: channelId,
                display_name: 'Shared Channel Name',
                type: General.OPEN_CHANNEL,
                delete_at: 0,
            })],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedChannelShare
                channelId={channelId}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('channel_share');
            expect(component).toHaveProp('displayName', 'Shared Channel Name');
        });
    });
});
