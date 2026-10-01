// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {setAgentsVersion} from '@agents/actions/local/version';
import {Preferences, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import NewMessagesLine from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type Database from '@nozbe/watermelondb/Database';

describe('NewMessagesLine', () => {
    const serverUrl = 'new-message-line.test.com';
    const channelId = 'channel-id';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        database = operator.database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    // Developer mode licenses agents analysis without a license record.
    const makeAgentsAvailable = async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'EnableDeveloper', value: 'true'},
                {id: 'EnableTesting', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleAIBots({bots: [TestHelper.fakeLLMBot()], prepareRecordsOnly: false});
        await setAgentsVersion(serverUrl, '2.9.0');
    };

    const baseProps = {
        theme: Preferences.THEMES.denim,
        testID: 'post_list.new_messages_line',
        channelId,
        location: Screens.CHANNEL,
    };

    it('should render only the separator when agents are unavailable', async () => {
        const {getByTestId, queryByTestId} = renderWithEverything(
            <NewMessagesLine {...baseProps}/>,
            {database, serverUrl},
        );

        expect(getByTestId('post_list.new_messages_line')).toBeTruthy();
        await waitFor(() => {
            expect(queryByTestId('post_list.new_messages_line.ask_ai')).toBeNull();
        });
    });

    it('should show the Ask AI pill when licensed and an agent is usable in the channel', async () => {
        await makeAgentsAvailable();

        const {getByTestId} = renderWithEverything(
            <NewMessagesLine {...baseProps}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            expect(getByTestId('post_list.new_messages_line.ask_ai')).toBeTruthy();
        });
        expect(getByTestId('post_list.new_messages_line')).toBeTruthy();
    });

    it('should hide the pill once the agents plugin is disabled, even with agents still stored', async () => {
        await makeAgentsAvailable();

        const {getByTestId, queryByTestId} = renderWithEverything(
            <NewMessagesLine {...baseProps}/>,
            {database, serverUrl},
        );
        await waitFor(() => {
            expect(getByTestId('post_list.new_messages_line.ask_ai')).toBeTruthy();
        });

        await act(async () => {
            await setAgentsVersion(serverUrl, '');
        });

        await waitFor(() => {
            expect(queryByTestId('post_list.new_messages_line.ask_ai')).toBeNull();
        });
    });

    it('should not show the pill in the thread view even when agents are available', async () => {
        await makeAgentsAvailable();

        const {getByTestId, queryByTestId} = renderWithEverything(
            <NewMessagesLine
                {...baseProps}
                location={Screens.THREAD}
            />,
            {database, serverUrl},
        );

        expect(getByTestId('post_list.new_messages_line')).toBeTruthy();
        await waitFor(() => {
            expect(queryByTestId('post_list.new_messages_line.ask_ai')).toBeNull();
        });
    });
});
