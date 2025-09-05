// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';

import SelectUserComponent from './select_user';

import SelectUser from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./select_user');
jest.mocked(SelectUserComponent).mockImplementation(
    (props) => React.createElement('SelectUser', {testID: 'select-user', ...props}),
);

const serverUrl = 'server-url';

describe('SelectUser', () => {
    function getBaseProps(): ComponentProps<typeof SelectUser> {
        return {
            handleSelect: jest.fn(),
            handleRemove: jest.fn(),
            selected: 'selected-user-id',
            componentId: 'PlaybookSelectUser',
            participantIds: ['participant-id'],
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
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const selectUser = getByTestId('select-user');

        // Default values from observables when no data exists
        expect(selectUser.props.currentUserId).toBe('');
        expect(selectUser.props.currentTeamId).toBe('');
    });

    it('should render correctly with current user data', async () => {
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: 'current-user-id',
            }],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const selectUser = getByTestId('select-user');
        expect(selectUser.props.currentUserId).toBe('current-user-id');
        expect(selectUser.props.currentTeamId).toBe('');
    });

    it('should render correctly with current team data', async () => {
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                value: 'current-team-id',
            }],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const selectUser = getByTestId('select-user');
        expect(selectUser.props.currentTeamId).toBe('current-team-id');
        expect(selectUser.props.currentUserId).toBe('');
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
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const selectUser = getByTestId('select-user');
        expect(selectUser.props.currentUserId).toBe('current-user-id');
        expect(selectUser.props.currentTeamId).toBe('current-team-id');
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
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const selectUser = getByTestId('select-user');
        expect(selectUser.props.currentUserId).toBe('current-user-id');
        expect(selectUser.props.currentTeamId).toBe('current-team-id');

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
            expect(selectUser.props.currentUserId).toBe('new-user-id');
            expect(selectUser.props.currentTeamId).toBe('current-team-id');
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
            expect(selectUser.props.currentUserId).toBe('new-user-id');
            expect(selectUser.props.currentTeamId).toBe('new-team-id');
        });
    });
});
