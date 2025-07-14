// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PlaybookRunsOptionComponent from './playbook_runs_option';

import PlaybookRunsOption from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./playbook_runs_option');
jest.mocked(PlaybookRunsOptionComponent).mockImplementation(
    (props) => React.createElement('PlaybookRunsOption', {testID: 'playbook-runs-option', ...props}),
);

const serverUrl = 'server-url';

describe('PlaybookRunsOption', () => {
    const channelId = 'channel-id';

    function getBaseProps(): ComponentProps<typeof PlaybookRunsOption> {
        return {
            channelId,
        };
    }

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    it('should render correctly without data', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<PlaybookRunsOption {...props}/>, {database});

        const playbookRunsOption = getByTestId('playbook-runs-option');
        expect(playbookRunsOption).toBeTruthy();
        expect(playbookRunsOption.props.channelId).toBe('channel-id');
        expect(playbookRunsOption.props.playbooksActiveRuns).toBe(0);
        expect(playbookRunsOption.props.channelName).toBe('');
    });

    it('should render correctly with data', async () => {
        await operator.handleChannel({
            prepareRecordsOnly: false,
            channels: [TestHelper.fakeChannel({id: channelId, display_name: 'Some channel name'})],
        });

        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: [
                TestHelper.fakePlaybookRun({id: 'run-1', channel_id: channelId}),
                TestHelper.fakePlaybookRun({id: 'run-2', channel_id: channelId, end_at: 123}),
                TestHelper.fakePlaybookRun({id: 'run-3', channel_id: channelId}),
            ],
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<PlaybookRunsOption {...props}/>, {database});

        const playbookRunsOption = getByTestId('playbook-runs-option');
        expect(playbookRunsOption).toBeTruthy();
        expect(playbookRunsOption.props.channelId).toBe('channel-id');
        expect(playbookRunsOption.props.playbooksActiveRuns).toBe(2);
        expect(playbookRunsOption.props.channelName).toBe('Some channel name');
    });
});
