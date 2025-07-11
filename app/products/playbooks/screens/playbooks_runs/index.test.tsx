// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PlaybookRunsComponent from './playbook_runs';

import PlaybookRuns from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./playbook_runs');
jest.mocked(PlaybookRunsComponent).mockImplementation(
    (props) => React.createElement('PlaybookRuns', {testID: 'playbook-runs', ...props}),
);

const serverUrl = 'server-url';

describe('PlaybookRuns', () => {
    const channelId = 'channel-id';

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof PlaybookRuns> {
        return {
            channelId,
            componentId: 'PlaybookRuns' as const,
        };
    }

    it('should render correctly without data', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<PlaybookRuns {...props}/>, {database});

        const playbookRuns = getByTestId('playbook-runs');
        expect(playbookRuns).toBeTruthy();
        expect(playbookRuns.props.allRuns).toHaveLength(0);
    });

    it('should render correctly with data', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: [
                TestHelper.fakePlaybookRun({id: 'run-1', channel_id: channelId}),
                TestHelper.fakePlaybookRun({id: 'run-2', channel_id: channelId, end_at: 123}),
                TestHelper.fakePlaybookRun({id: 'run-3', channel_id: channelId}),
            ],
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<PlaybookRuns {...props}/>, {database});

        const playbookRuns = getByTestId('playbook-runs');
        expect(playbookRuns).toBeTruthy();
        expect(playbookRuns.props.allRuns).toHaveLength(3);
    });
});
