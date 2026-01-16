// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SelectPlaybookComponent from './select_playbook';

import SelectPlaybook from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./select_playbook');
jest.mocked(SelectPlaybookComponent).mockImplementation(
    (props) => React.createElement('SelectPlaybook', {testID: 'select-playbook', ...props}),
);

const serverUrl = 'server-url';

describe('SelectPlaybook', () => {
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
        const {getByTestId} = renderWithEverything(<SelectPlaybook/>, {database});

        const selectPlaybook = getByTestId('select-playbook');

        // Default values from observables when no data exists
        expect(selectPlaybook.props.currentUserId).toBe('');
        expect(selectPlaybook.props.currentTeamId).toBe('');
        expect(selectPlaybook.props.playbooksUsedInChannel).toEqual(new Set<string>());
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

        const {getByTestId} = renderWithEverything(<SelectPlaybook/>, {database});

        const selectPlaybook = getByTestId('select-playbook');
        expect(selectPlaybook.props.currentUserId).toBe('current-user-id');
        expect(selectPlaybook.props.currentTeamId).toBe('current-team-id');
        expect(selectPlaybook.props.playbooksUsedInChannel).toEqual(new Set<string>());
    });

    it('should render correctly with playbooks used in channel', async () => {
        const channelId = 'channel-id-1';
        const playbookId1 = 'playbook-id-1';
        const playbookId2 = 'playbook-id-2';

        // Set up current channel ID
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                value: channelId,
            }],
            prepareRecordsOnly: false,
        });

        // Create playbook runs for the channel
        const mockRuns = [
            TestHelper.fakePlaybookRun({id: 'run-1', channel_id: channelId, playbook_id: playbookId1}),
            TestHelper.fakePlaybookRun({id: 'run-2', channel_id: channelId, playbook_id: playbookId2}),
            TestHelper.fakePlaybookRun({id: 'run-3', channel_id: channelId, playbook_id: playbookId1}), // Duplicate playbook ID
        ];

        await operator.handlePlaybookRun({
            runs: mockRuns,
            prepareRecordsOnly: false,
            removeAssociatedRecords: false,
        });

        const {getByTestId} = renderWithEverything(<SelectPlaybook/>, {database});

        await waitFor(() => {
            const selectPlaybook = getByTestId('select-playbook');
            expect(selectPlaybook.props.playbooksUsedInChannel).toBeInstanceOf(Set);
            expect(selectPlaybook.props.playbooksUsedInChannel.size).toBe(2);
            expect(selectPlaybook.props.playbooksUsedInChannel.has(playbookId1)).toBe(true);
            expect(selectPlaybook.props.playbooksUsedInChannel.has(playbookId2)).toBe(true);
        });
    });

    it('should return empty set when channel has no playbook runs', async () => {
        const channelId = 'channel-id-1';

        // Set up current channel ID
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                value: channelId,
            }],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(<SelectPlaybook/>, {database});

        await waitFor(() => {
            const selectPlaybook = getByTestId('select-playbook');
            expect(selectPlaybook.props.playbooksUsedInChannel).toEqual(new Set<string>());
        });
    });

    it('should update playbooksUsedInChannel when channel changes', async () => {
        const channelId1 = 'channel-id-1';
        const channelId2 = 'channel-id-2';
        const playbookId1 = 'playbook-id-1';
        const playbookId2 = 'playbook-id-2';

        // Set up initial channel
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                value: channelId1,
            }],
            prepareRecordsOnly: false,
        });

        // Create playbook run for first channel
        const mockRun1 = TestHelper.fakePlaybookRun({
            id: 'run-1',
            channel_id: channelId1,
            playbook_id: playbookId1,
        });

        await operator.handlePlaybookRun({
            runs: [mockRun1],
            prepareRecordsOnly: false,
            removeAssociatedRecords: false,
        });

        const {getByTestId} = renderWithEverything(<SelectPlaybook/>, {database});

        await waitFor(() => {
            const selectPlaybook = getByTestId('select-playbook');
            expect(selectPlaybook.props.playbooksUsedInChannel.has(playbookId1)).toBe(true);
        });

        // Create playbook run for second channel
        const mockRun2 = TestHelper.fakePlaybookRun({
            id: 'run-2',
            channel_id: channelId2,
            playbook_id: playbookId2,
        });

        await operator.handlePlaybookRun({
            runs: [mockRun2],
            prepareRecordsOnly: false,
            removeAssociatedRecords: false,
        });

        // Switch to second channel
        await act(async () => {
            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                    value: channelId2,
                }],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            const selectPlaybook = getByTestId('select-playbook');
            expect(selectPlaybook.props.playbooksUsedInChannel.has(playbookId1)).toBe(false);
            expect(selectPlaybook.props.playbooksUsedInChannel.has(playbookId2)).toBe(true);
        });
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

        const {getByTestId} = renderWithEverything(<SelectPlaybook/>, {database});

        const selectPlaybook = getByTestId('select-playbook');
        expect(selectPlaybook.props.currentUserId).toBe('current-user-id');
        expect(selectPlaybook.props.currentTeamId).toBe('current-team-id');

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
            expect(selectPlaybook.props.currentUserId).toBe('new-user-id');
            expect(selectPlaybook.props.currentTeamId).toBe('current-team-id');
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
            expect(selectPlaybook.props.currentUserId).toBe('new-user-id');
            expect(selectPlaybook.props.currentTeamId).toBe('new-team-id');
        });
    });

    it('should extract unique playbook IDs from runs', async () => {
        const channelId = 'channel-id-1';
        const playbookId1 = 'playbook-id-1';
        const playbookId2 = 'playbook-id-2';
        const playbookId3 = 'playbook-id-3';

        // Set up current channel ID
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                value: channelId,
            }],
            prepareRecordsOnly: false,
        });

        // Create playbook runs with duplicate playbook IDs
        const mockRuns = [
            TestHelper.fakePlaybookRun({id: 'run-1', channel_id: channelId, playbook_id: playbookId1}),
            TestHelper.fakePlaybookRun({id: 'run-2', channel_id: channelId, playbook_id: playbookId2}),
            TestHelper.fakePlaybookRun({id: 'run-3', channel_id: channelId, playbook_id: playbookId1}), // Duplicate
            TestHelper.fakePlaybookRun({id: 'run-4', channel_id: channelId, playbook_id: playbookId3}),
            TestHelper.fakePlaybookRun({id: 'run-5', channel_id: channelId, playbook_id: playbookId2}), // Duplicate
        ];

        await operator.handlePlaybookRun({
            runs: mockRuns,
            prepareRecordsOnly: false,
            removeAssociatedRecords: false,
        });

        const {getByTestId} = renderWithEverything(<SelectPlaybook/>, {database});

        await waitFor(() => {
            const selectPlaybook = getByTestId('select-playbook');

            // Should only contain unique playbook IDs
            expect(selectPlaybook.props.playbooksUsedInChannel.size).toBe(3);
            expect(selectPlaybook.props.playbooksUsedInChannel.has(playbookId1)).toBe(true);
            expect(selectPlaybook.props.playbooksUsedInChannel.has(playbookId2)).toBe(true);
            expect(selectPlaybook.props.playbooksUsedInChannel.has(playbookId3)).toBe(true);
        });
    });
});

