// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import StartARunComponent from './start_a_run';

import StartARun from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./start_a_run');
jest.mocked(StartARunComponent).mockImplementation(
    (props) => React.createElement('StartARun', {testID: 'start-a-run', ...props}),
);

const serverUrl = 'server-url';

describe('StartARun', () => {
    function getBaseProps(): ComponentProps<typeof StartARun> {
        return {
            componentId: 'PlaybooksStartARun',
            onRunCreated: jest.fn(),
            playbook: TestHelper.fakePlaybook({
                id: 'playbook-id',
                title: 'Test Playbook',
            }),
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

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    it('should render correctly with no data', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<StartARun {...props}/>, {database});

        const startARun = getByTestId('start-a-run');

        // Default values from observables when no data exists
        expect(startARun.props.currentUserId).toBe('');
        expect(startARun.props.currentTeamId).toBe('');
    });

    it('should render correctly with both current user and team data', async () => {
        await operator.handleSystem({
            systems: [
                {
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: 'current-user-id',
                },
                {
                    id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                    value: 'current-team-id',
                },
            ],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<StartARun {...props}/>, {database});

        const startARun = getByTestId('start-a-run');
        expect(startARun.props.currentUserId).toBe('current-user-id');
        expect(startARun.props.currentTeamId).toBe('current-team-id');
    });

    it('should update observables when data changes', async () => {
        await operator.handleSystem({
            systems: [
                {
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: 'current-user-id',
                },
                {
                    id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                    value: 'current-team-id',
                },
            ],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<StartARun {...props}/>, {database});

        const startARun = getByTestId('start-a-run');
        expect(startARun.props.currentUserId).toBe('current-user-id');
        expect(startARun.props.currentTeamId).toBe('current-team-id');

        await act(async () => {
            // Update current user ID
            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: 'new-user-id',
                }],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            expect(startARun.props.currentUserId).toBe('new-user-id');
            expect(startARun.props.currentTeamId).toBe('current-team-id');
        });

        await act(async () => {
            // Update current team ID
            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                    value: 'new-team-id',
                }],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            expect(startARun.props.currentUserId).toBe('new-user-id');
            expect(startARun.props.currentTeamId).toBe('new-team-id');
        });
    });
});

